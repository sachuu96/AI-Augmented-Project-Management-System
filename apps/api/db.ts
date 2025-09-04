import { Pool, QueryResult } from "pg";

export const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "app",
  password: process.env.DB_PASSWORD || "password",
  port: Number(process.env.DB_PORT || 5432),
});

export async function query(
  text: string,
  params?: any[]
): Promise<QueryResult> {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}
