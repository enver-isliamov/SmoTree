
import { db } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, user } = await req.json();

    if (!projectId || !user || !user.id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await db.connect();

    // 1. Fetch current project data
    const { rows } = await client.sql`
        SELECT data FROM projects WHERE id = ${projectId};
    `;

    if (rows.length === 0) {
        return res.status(404).json({ error: "Project not found" });
    }

    let projectData = rows[0].data;

    // 2. Check if user is already in team
    const alreadyExists = projectData.team.some(m => m.id === user.id);

    if (!alreadyExists) {
        // 3. Add user to team
        projectData.team.push(user);

        // 4. Update Database
        await client.sql`
            UPDATE projects 
            SET data = ${JSON.stringify(projectData)}::jsonb,
                updated_at = ${Date.now()}
            WHERE id = ${projectId};
        `;
        
        console.log(`User ${user.name} joined project ${projectId}`);
    } else {
        console.log(`User ${user.name} already in project ${projectId}`);
    }

    return res.status(200).json({ success: true, project: projectData });

  } catch (error) {
    console.error("Join error:", error);
    return res.status(500).json({ error: error.message });
  }
}
