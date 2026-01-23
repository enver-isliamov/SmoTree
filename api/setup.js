
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  // Allow running setup simply by visiting the URL (GET) or via POST
  
  if (!process.env.POSTGRES_URL) {
      return res.status(500).json({ error: "Database configuration missing (POSTGRES_URL)." });
  }

  try {
    console.log("🛠 Starting Database Setup...");

    // 1. Projects Table - The core table
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        data JSONB NOT NULL,
        updated_at BIGINT,
        created_at BIGINT
      );
    `;
    
    // 2. Index for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_owner_id ON projects (owner_id);`;

    console.log("✅ Tables created/verified.");

    return res.status(200).json({ 
        success: true, 
        message: "Database initialized successfully. You can now use the app." 
    });

  } catch (error) {
    console.error("Setup failed:", error);
    return res.status(500).json({ 
        error: "Setup Failed", 
        details: error.message,
        hint: "Check if your Vercel Project has the Postgres Store connected."
    });
  }
}
