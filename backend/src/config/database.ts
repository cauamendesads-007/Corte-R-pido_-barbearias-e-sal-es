import mysql from 'mysql2/promise';
import { env } from './env';

export const pool = mysql.createPool({
  host: env.MYSQL_HOST,
  port: env.MYSQL_PORT,
  user: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD,
  database: env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
});

export async function testConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ Conexão com MySQL estabelecida');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar no MySQL:', error);
    return false;
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
  console.log('🔌 Pool de conexões MySQL fechado');
}