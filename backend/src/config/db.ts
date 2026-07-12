import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'flowasset',
  waitForConnections: true,
  connectionLimit: 10, // Adjust this limit based on your expected traffic
  queueLimit: 0,
});

// Test the connection pool immediately when the app starts
export const testDBConnection = async (): Promise<void> => {
  try {
    const connection = await db.getConnection();
    console.log('Successfully connected to the MySQL database.');
    connection.release(); // Return the connection back to the pool
  } catch (error) {
    console.error('Database connection failed! Error details:', error);
    process.exit(1); // Stop the server from booting if the database is unreachable
  }
};

export default db;