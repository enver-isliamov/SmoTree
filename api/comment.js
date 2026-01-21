
import { db } from '@vercel/postgres';

// --- AUTH HELPER (Duplicated from data.js for isolation) ---
async function getAuthenticatedUser(req) {
    const authHeader = req.headers.get('authorization');
    
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
                    role: 'Admin', // Assumed for verified users
                    isVerified: true
                };
            }
        } catch (e) {
            console.error("Auth validation failed", e);
        }
    }

    // 2. Guest Fallback
    const guestId = req.headers.get('x-guest-id');
    if (guestId) {
        return {
            id: guestId,
            name: 'Guest',
            role: 'Guest',
            isVerified: false
        };
    }

    return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { projectId, assetId, versionId, action, payload } = await req.json();

    if (!projectId || !assetId || !versionId || !action) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await db.connect();

    // 1. Fetch Project
    const { rows } = await client.sql`
        SELECT data, owner_id FROM projects WHERE id = ${projectId};
    `;

    if (rows.length === 0) {
        return res.status(404).json({ error: "Project not found" });
    }

    let projectData = rows[0].data;
    const ownerId = rows[0].owner_id;

    // 2. Security Check: Is user in team or owner?
    const isOwner = ownerId === user.id;
    const isInTeam = projectData.team.some(m => m.id === user.id);

    if (!isOwner && !isInTeam) {
        return res.status(403).json({ error: "Access denied" });
    }

    // 3. Locate the Version array
    const asset = projectData.assets.find(a => a.id === assetId);
    if (!asset) return res.status(404).json({ error: "Asset not found" });

    const version = asset.versions.find(v => v.id === versionId);
    if (!version) return res.status(404).json({ error: "Version not found" });

    if (!version.comments) version.comments = [];

    // 4. Perform Action
    switch (action) {
        case 'create':
            // Payload is the full comment object
            const newComment = {
                ...payload,
                userId: user.id, // Enforce correct author
                createdAt: 'Just now'
            };
            version.comments.push(newComment);
            break;

        case 'update':
            // Payload: { id, text, status }
            const commentIndex = version.comments.findIndex(c => c.id === payload.id);
            if (commentIndex !== -1) {
                const existing = version.comments[commentIndex];
                
                // Permission: Only author or Admin/Owner can edit
                if (existing.userId !== user.id && !user.isVerified) {
                     return res.status(403).json({ error: "Guests can only edit their own comments" });
                }

                version.comments[commentIndex] = { ...existing, ...payload };
            }
            break;

        case 'delete':
            // Payload: { id }
            const cIndex = version.comments.findIndex(c => c.id === payload.id);
            if (cIndex !== -1) {
                const existing = version.comments[cIndex];
                 // Permission: Only author or Admin/Owner can delete
                 if (existing.userId !== user.id && !user.isVerified) {
                    return res.status(403).json({ error: "Guests can only delete their own comments" });
               }
                version.comments.splice(cIndex, 1);
            }
            break;

        default:
            return res.status(400).json({ error: "Invalid action" });
    }

    // 5. Save back to DB
    await client.sql`
        UPDATE projects 
        SET data = ${JSON.stringify(projectData)}::jsonb,
            updated_at = ${Date.now()}
        WHERE id = ${projectId};
    `;

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Comment API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
