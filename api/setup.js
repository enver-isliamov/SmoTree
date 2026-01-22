
import { db } from '@vercel/postgres';

export default async function handler(req, res) {
  // Check if DB credentials exist
  if (!process.env.POSTGRES_URL) {
      return res.status(500).json({ 
          error: "Database configuration missing.", 
          details: "POSTGRES_URL environment variable is not set. Please connect a Vercel Postgres store in the dashboard."
      });
  }

  try {
    const client = await db.connect();

    // 1. Existing Legacy Table (JSONB)
    await client.sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        data JSONB NOT NULL,
        updated_at BIGINT,
        created_at BIGINT
      );
    `;
    await client.sql`
      CREATE INDEX IF NOT EXISTS idx_owner_id ON projects (owner_id);
    `;

    // 2. New Normalized Tables (For Future Migration)
    
    // Users
    await client.sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        avatar TEXT,
        role TEXT
      );
    `;

    // Assets
    await client.sql`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT,
        thumbnail TEXT,
        current_version_index INTEGER DEFAULT 0,
        versions JSONB -- Array of versions still kept as JSON for simplicity initially
      );
    `;

    // Comments (Fully Normalized)
    await client.sql`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        asset_id TEXT, -- Relation logic to be defined in app
        version_id TEXT,
        user_id TEXT,
        timestamp FLOAT,
        duration FLOAT,
        text TEXT,
        status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return res.status(200).json({ message: "Database initialized successfully (Legacy + Normalized structures created)" });
  } catch (error) {
    console.error("Setup failed:", error);
    return res.status(500).json({ error: error.message });
  }
}
