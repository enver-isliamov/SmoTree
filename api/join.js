
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
    }

    const { projectId, user } = body || {};

    if (!projectId || !user || !user.id) {
        return res.status(400).json({ error: "Missing required fields (projectId, user)" });
    }

    // 1. Fetch current project data
    const { rows } = await sql`
        SELECT data FROM projects WHERE id = ${projectId};
    `;

    if (rows.length === 0) {
        // This is the common 404 error. It means the Admin hasn't synced the project yet.
        console.warn(`Join failed: Project ${projectId} not found in DB.`);
        return res.status(404).json({ error: "Project not found. The owner may not have synced changes yet." });
    }

    let projectData = rows[0].data;

    // 2. Ensure team array exists
    if (!Array.isArray(projectData.team)) {
        projectData.team = [];
    }

    // 3. Check if user is already in team
    const existingMemberIndex = projectData.team.findIndex(m => m.id === user.id);

    if (existingMemberIndex === -1) {
        projectData.team.push(user);
        projectData.updatedAt = 'Just now';

        await sql`
            UPDATE projects 
            SET data = ${JSON.stringify(projectData)}::jsonb,
                updated_at = ${Date.now()}
            WHERE id = ${projectId};
        `;
        
        console.log(`✅ User ${user.name} (${user.id}) joined project ${projectId}`);
    }

    return res.status(200).json({ success: true, project: projectData });

  } catch (error) {
    console.error("Join error:", error);
    return res.status(500).json({ error: error.message });
  }
}
