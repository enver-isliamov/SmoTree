import { del } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: "Server configuration error: Missing Blob Token" });
  }

  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: "No URLs provided for deletion" });
    }

    // Filter out mock/external URLs that are not in Vercel Blob
    // Vercel Blob URLs usually contain 'public.blob.vercel-storage.com' or similar
    // But safely we can just try to delete them, the SDK handles non-existent ones gracefully usually
    // or we filter simply.
    
    console.log("Deleting blobs:", urls);
    await del(urls);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ error: error.message });
  }
}