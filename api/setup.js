
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

    // Создаем таблицу проектов, если её еще нет
    await client.sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        data JSONB NOT NULL,
        updated_at BIGINT,
        created_at BIGINT
      );
    `;

    // Создаем "Оглавление" (Индекс) для быстрого поиска по Владельцу
    await client.sql`
      CREATE INDEX IF NOT EXISTS idx_owner_id ON projects (owner_id);
    `;

    return res.status(200).json({ message: "Database initialized successfully" });
  } catch (error) {
    console.error("Setup failed:", error);
    return res.status(500).json({ error: error.message });
  }
}
