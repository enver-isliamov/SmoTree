
import { sql } from '@vercel/postgres';

// --- AUTH HELPER ---
async function getAuthenticatedUser(req) {
    const authHeader = req.headers['authorization'];
    
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
    const guestId = req.headers['x-guest-id'];
    if (guestId) {
        return {
            id: guestId,
            name: 'Guest',
            isVerified: false
        };
    }

    return null;
}

// --- DB INIT HELPER ---
async function ensureProjectsTable() {
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        data JSONB NOT NULL,
        updated_at BIGINT,
        created_at BIGINT
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_owner_id ON projects (owner_id);`;
    console.log("✅ Table 'projects' created automatically.");
}

export default async function handler(req, res) {
  try {
      const user = await getAuthenticatedUser(req);
      
      if (!user) {
          return res.status(401).json({ error: "Unauthorized" });
      }

      // GET: Retrieve Projects
      if (req.method === 'GET') {
        try {
          const { rows } = await sql`
            SELECT data FROM projects 
            WHERE owner_id = ${user.id} 
            OR (
                jsonb_typeof(data->'team') = 'array' 
                AND EXISTS (
                    SELECT 1 
                    FROM jsonb_array_elements(data->'team') AS member 
                    WHERE member->>'id' = ${user.id}
                )
            );
          `;
          const projects = rows.map(r => r.data);
          return res.status(200).json(projects);

        } catch (dbError) {
           // ERROR 42P01: undefined_table (Table doesn't exist yet)
           if (dbError.code === '42P01') {
               return res.status(200).json([]); // No tables = No projects. Return empty array.
           }
           console.error("DB GET Error Details:", dbError); 
           return res.status(500).json({ error: "Database error", details: dbError.message });
        }
      } 
      
      // POST: Sync Projects (Upsert)
      if (req.method === 'POST') {
        const isManualAdmin = user.id.startsWith('admin-');
        if (!user.isVerified && !isManualAdmin) {
            return res.status(403).json({ error: "Read-only access." });
        }

        let projectsToSync = req.body;
        if (typeof projectsToSync === 'string') {
            try { projectsToSync = JSON.parse(projectsToSync); } catch(e) {}
        }
        
        if (!Array.isArray(projectsToSync)) {
            return res.status(400).json({ error: "Expected array of projects" });
        }

        for (const project of projectsToSync) {
            if (!project.id) continue;

            const isOwner = project.ownerId === user.id;
            const isTeam = project.team && Array.isArray(project.team) && project.team.some(m => m.id === user.id);
            
            if (isOwner || isTeam) {
                const projectJson = JSON.stringify(project);
                
                try {
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
                } catch (dbError) {
                    // Lazy Init: If table missing, create it and retry ONCE
                    if (dbError.code === '42P01') {
                        await ensureProjectsTable();
                        // Retry the query
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
                    } else {
                        throw dbError;
                    }
                }
            }
        }
        return res.status(200).json({ success: true });
      }

      // DELETE: Remove a project
      if (req.method === 'DELETE') {
          const isManualAdmin = user.id.startsWith('admin-');
          if (!user.isVerified && !isManualAdmin) {
              return res.status(403).json({ error: "Guests cannot delete projects." });
          }

          const projectId = req.query.id;
          if (!projectId) return res.status(400).json({ error: "Missing project ID" });

          try {
            await sql`
                DELETE FROM projects 
                WHERE id = ${projectId} AND owner_id = ${user.id};
            `;
          } catch (e) {
             if (e.code === '42P01') return res.status(200).json({ success: true }); // Table missing = already deleted
             throw e;
          }
          
          return res.status(200).json({ success: true });
      }

      return res.status(405).send("Method not allowed");

  } catch (globalError) {
      console.error("Critical API Error:", globalError);
      return res.status(500).json({ error: "Critical Server Error", details: globalError.message });
  }
}
