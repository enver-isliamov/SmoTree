import { put, list } from '@vercel/blob';

// Switch to Node.js runtime (default) to support @vercel/blob dependencies
export default async function handler(req, res) {
  // GET: Fetch the current state
  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ limit: 100 });
      // Find 'db.json'
      const dbBlob = blobs.find(b => b.pathname === 'db.json');
      
      if (dbBlob) {
        // Node.js 18+ has native fetch
        const response = await fetch(dbBlob.url);
        const data = await response.json();
        return res.status(200).json(data);
      }
      // If no DB exists, return null
      return res.status(200).json(null);
    } catch (error) {
       console.error(error);
       return res.status(500).json({ error: error.message });
    }
  } 
  
  // POST: Save the state
  if (req.method === 'POST') {
    try {
      // Vercel Serverless Functions parse JSON body automatically
      const body = req.body;
      
      const { url } = await put('db.json', JSON.stringify(body), { 
          access: 'public', 
          addRandomSuffix: false 
      });
      return res.status(200).json({ success: true, url });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).send("Method not allowed");
}
