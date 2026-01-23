
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (!process.env.POSTGRES_URL) {
      return res.status(500).json({ error: "Database configuration missing." });
  }

  try {
    // 1. Projects Table
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        data JSONB NOT NULL,
        updated_at BIGINT,
        created_at BIGINT
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_owner_id ON projects (owner_id);`;

    // 2. Placeholder tables for future use
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        name TEXT,
        avatar TEXT,
        role TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT,
        thumbnail TEXT,
        current_version_index INTEGER DEFAULT 0,
        versions JSONB
      );
    `;

    return res.status(200).json({ message: "Database initialized successfully" });
  } catch (error) {
    console.error("Setup failed:", error);
    return res.status(500).json({ error: error.message });
  }
}
