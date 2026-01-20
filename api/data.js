import { put, list } from '@vercel/blob';

export const config = {
  runtime: 'edge',
};

// Simple Persistence Layer for SmoTree
// Stores the entire projects array in a single 'db.json' file in the Blob Store.
export default async function handler(req) {
  // GET: Fetch the current state
  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ limit: 100 });
      // Find 'db.json'
      const dbBlob = blobs.find(b => b.pathname === 'db.json');
      
      if (dbBlob) {
        const response = await fetch(dbBlob.url);
        const data = await response.json();
        return new Response(JSON.stringify(data), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
      }
      // If no DB exists, return null so frontend uses Mock/Empty
      return new Response(JSON.stringify(null), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
       return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  } 
  
  // POST: Save the state
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      // Overwrite db.json with new data. 'addRandomSuffix: false' ensures we keep one file.
      const { url } = await put('db.json', JSON.stringify(body), { 
          access: 'public', 
          addRandomSuffix: false 
      });
      return new Response(JSON.stringify({ success: true, url }), { status: 200 });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}