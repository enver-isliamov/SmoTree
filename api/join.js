
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
        return res.status(404).json({ error: "Project not found in DB" });
    }

    let projectData = rows[0].data;

    // 2. Ensure team array exists
    if (!Array.isArray(projectData.team)) {
        projectData.team = [];
    }

    // 3. Check if user is already in team
    const existingMemberIndex = projectData.team.findIndex(m => m.id === user.id);

    if (existingMemberIndex === -1) {
        // Add user to team
        projectData.team.push(user);
        
        // Mark update time
        projectData.updatedAt = 'Just now';

        // 4. Update Database
        await client.sql`
            UPDATE projects 
            SET data = ${JSON.stringify(projectData)}::jsonb,
                updated_at = ${Date.now()}
            WHERE id = ${projectId};
        `;
        
        console.log(`✅ User ${user.name} (${user.id}) joined project ${projectId}`);
    } else {
        // If user exists but details changed (e.g. name update), ideally we update here, 
        // but for now we just acknowledge they are in.
        console.log(`User ${user.name} already in project ${projectId}`);
    }

    // Return the FULL updated project data so the frontend can display it immediately
    return res.status(200).json({ success: true, project: projectData });

  } catch (error) {
    console.error("Join error:", error);
    return res.status(500).json({ error: error.message });
  }
}
