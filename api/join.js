
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Vercel Node.js runtime: Use req.body instead of req.json()
    const { projectId, user } = req.body;

    if (!projectId || !user || !user.id) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Fetch current project data
    const { rows } = await sql`
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
        projectData.updatedAt = 'Just now';

        // 4. Update Database
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
