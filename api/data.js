
import { db } from '@vercel/postgres';

// --- AUTH HELPER ---
// Verifies Google ID Token sent in headers
async function getAuthenticatedUser(req) {
    const authHeader = req.headers.get('authorization');
    
    // 1. Google Auth (Strong)
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
            if (response.ok) {
                const payload = await response.json();
                return {
                    id: payload.email,
                    email: payload.email,
                    name: payload.name,
                    isVerified: true
                };
            }
        } catch (e) {
            console.error("Auth validation failed", e);
        }
    }

    // 2. Guest Fallback (Weak, Read-Only for assigned projects)
    const guestId = req.headers.get('x-guest-id');
    if (guestId) {
        return {
            id: guestId,
            name: 'Guest',
            isVerified: false
        };
    }

    return null;
}

export default async function handler(req, res) {
  const user = await getAuthenticatedUser(req);
  
  if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
  }

  const client = await db.connect();

  // GET: Retrieve Projects for this User
  if (req.method === 'GET') {
    try {
      // Allow if: User is Owner OR User is in Team
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
    // SECURITY UPDATE: 
    // Allow Google Verified users OR Manual Admins (ID starts with 'admin-') to save data.
    // This enables the "Continue as Guest/Admin" flow to actually work with the DB.
    const isManualAdmin = user.id.startsWith('admin-');
    
    if (!user.isVerified && !isManualAdmin) {
        return res.status(403).json({ error: "Guests cannot overwrite project data. Read-only access." });
    }

    try {
      const projectsToSync = await req.json(); 
      
      if (!Array.isArray(projectsToSync)) {
          return res.status(400).json({ error: "Expected array of projects" });
      }

      for (const project of projectsToSync) {
          // Double check ownership/membership
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

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DB Write Error", error);
      return res.status(500).json({ error: error.message });
    }
  }

  // DELETE: Remove a project
  if (req.method === 'DELETE') {
      const isManualAdmin = user.id.startsWith('admin-');
      if (!user.isVerified && !isManualAdmin) {
          return res.status(403).json({ error: "Guests cannot delete projects." });
      }

      try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const projectId = url.searchParams.get('id');

          if (!projectId) {
              return res.status(400).json({ error: "Missing project ID" });
          }

          await client.sql`
            DELETE FROM projects 
            WHERE id = ${projectId} AND owner_id = ${user.id};
          `;
          
          return res.status(200).json({ success: true });
      } catch (error) {
          console.error("DB Delete Error", error);
          return res.status(500).json({ error: error.message });
      }
  }

  return res.status(405).send("Method not allowed");
}
