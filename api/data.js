
import { sql } from '@vercel/postgres';

// --- AUTH HELPER (Node.js Runtime Compatible) ---
async function getAuthenticatedUser(req) {
    const authHeader = req.headers['authorization']; // Node.js style headers
    
    // 1. Google Auth
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

    // 2. Guest Fallback
    const guestId = req.headers['x-guest-id']; // Node.js style headers
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

  // GET: Retrieve Projects
  if (req.method === 'GET') {
    try {
      const userIdPattern = `%${user.id}%`;
      
      const { rows } = await sql`
        SELECT data FROM projects 
        WHERE owner_id = ${user.id} 
        OR data::text LIKE ${userIdPattern};
      `;
      
      // JS Filtering
      const projects = rows
        .map(r => r.data)
        .filter(p => {
            const isOwner = p.ownerId === user.id;
            const isTeam = p.team && Array.isArray(p.team) && p.team.some(m => m.id === user.id);
            return isOwner || isTeam;
        });

      return res.status(200).json(projects);
    } catch (error) {
       console.error("DB GET Error:", error); 
       return res.status(500).json({ error: error.message });
    }
  } 
  
  // POST: Sync Projects (Upsert)
  if (req.method === 'POST') {
    const isManualAdmin = user.id.startsWith('admin-');
    if (!user.isVerified && !isManualAdmin) {
        return res.status(403).json({ error: "Read-only access." });
    }

    try {
      // Vercel/Node.js automatically parses JSON into req.body
      const projectsToSync = req.body; 
      
      if (!Array.isArray(projectsToSync)) return res.status(400).json({ error: "Expected array" });

      for (const project of projectsToSync) {
          if (project.ownerId === user.id || (project.team && project.team.some(m => m.id === user.id))) {
              const projectJson = JSON.stringify(project);
              
              await sql`
                INSERT INTO projects (id, owner_id, data, updated_at, created_at)
                VALUES (
                    ${project.id}, 
                    ${project.ownerId || user.id}, 
                    ${projectJson}::jsonb, 
                    ${Date.now()}, 
                    ${project.createdAt || Date.now()}
                )
                ON CONFLICT (id) 
                DO UPDATE SET 
                    data = ${projectJson}::jsonb,
                    updated_at = ${Date.now()};
              `;
          }
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("DB POST Error:", error);
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
          // req.query contains query parameters in Vercel functions
          const projectId = req.query.id;

          if (!projectId) return res.status(400).json({ error: "Missing project ID" });

          await sql`
            DELETE FROM projects 
            WHERE id = ${projectId} AND owner_id = ${user.id};
          `;
          
          return res.status(200).json({ success: true });
      } catch (error) {
          console.error("DB DELETE Error:", error);
          return res.status(500).json({ error: error.message });
      }
  }

  return res.status(405).send("Method not allowed");
}
