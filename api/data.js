
import { db } from '@vercel/postgres';

// --- AUTH HELPER ---
// Verifies Google ID Token sent in headers
async function getAuthenticatedUser(req) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    const token = authHeader.split(' ')[1];

    try {
        // Validate token via Google's endpoint
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (!response.ok) return null;
        
        const payload = await response.json();
        // Return user info. We use email as the ID.
        return {
            id: payload.email,
            email: payload.email,
            name: payload.name
        };
    } catch (e) {
        console.error("Auth validation failed", e);
        return null;
    }
}

export default async function handler(req, res) {
  // 1. Verify Auth
  const user = await getAuthenticatedUser(req);
  
  if (!user) {
      // Allow Guest/Demo mode locally if needed, but for SaaS we want strict auth
      // For now, if no auth, return empty or error.
      // If requests come from localhost without token, we might skip logic or mock it.
      // Returing 401
      return res.status(401).json({ error: "Unauthorized" });
  }

  const client = await db.connect();

  // GET: Retrieve Projects for this User
  if (req.method === 'GET') {
    try {
      // Query: Find projects where owner_id matches OR user is in the team array inside the JSONB
      // JSONB Query: data->'team' @> '[{"id": "user@email.com"}]'
      const { rows } = await client.sql`
        SELECT data FROM projects 
        WHERE owner_id = ${user.id} 
        OR data->'team' @> ${JSON.stringify([{ id: user.id }])}::jsonb;
      `;
      
      const projects = rows.map(r => r.data);
      return res.status(200).json(projects);
    } catch (error) {
       console.error("DB Read Error", error);
       return res.status(500).json({ error: error.message });
    }
  } 
  
  // POST: Sync Projects (Upsert)
  if (req.method === 'POST') {
    try {
      const projectsToSync = await req.json(); // Use req.json() in newer Node envs or req.body depending on runtime
      
      if (!Array.isArray(projectsToSync)) {
          return res.status(400).json({ error: "Expected array of projects" });
      }

      // We only allow users to update projects they own or are part of.
      // For simplicity in this sync step, we iterate and upsert.
      
      for (const project of projectsToSync) {
          // Security Check: Is user owner or in team?
          const isOwner = project.ownerId === user.id;
          const isTeam = project.team && project.team.some(m => m.id === user.id);
          
          if (isOwner || isTeam) {
              await client.sql`
                INSERT INTO projects (id, owner_id, data, updated_at, created_at)
                VALUES (
                    ${project.id}, 
                    ${project.ownerId || user.id}, 
                    ${JSON.stringify(project)}::jsonb, 
                    ${Date.now()}, 
                    ${project.createdAt || Date.now()}
                )
                ON CONFLICT (id) 
                DO UPDATE SET 
                    data = ${JSON.stringify(project)}::jsonb,
                    updated_at = ${Date.now()};
              `;
          }
      }

      // Handle deletions? 
      // The current frontend sends the *entire* state. 
      // If a project is missing from the list BUT exists in DB for this owner, we should probably delete it?
      // For SAFETY in this iteration, we do NOT auto-delete missing projects to prevent data loss bugs.
      // Deletion is handled by a separate explicit endpoint or logic if needed.

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DB Write Error", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).send("Method not allowed");
}
