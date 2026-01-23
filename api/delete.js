
import { del } from '@vercel/blob';

// Helper to verify Google Token
async function isAuthorized(req) {
    const authHeader = req.headers['authorization']; // Node.js style
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }
    const token = authHeader.split(' ')[1];

    try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        return response.ok;
    } catch (e) {
        return false;
    }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: "Server configuration error: Missing Blob Token" });
  }

  // 1. Security Check
  const auth = await isAuthorized(req);
  if (!auth) {
      return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { urls } = req.body; // Node.js style
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "No URLs provided for deletion" });
    }
    
    console.log("Deleting blobs:", urls);
    await del(urls);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: error.message });
  }
}
