// config/database.js
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "12345",
  database: process.env.DB_NAME || "msg",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create messages table if not exists
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        pubk_jwk JSON NULL,
        salt BINARY(16) NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        message JSON NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_read TINYINT(1) DEFAULT 0,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      );`);

    await connection.query(`
        CREATE TABLE IF NOT EXISTS symmetric_key (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner INT NOT NULL,
        recipient INT NOT NULL,
        encrypted_key JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient) REFERENCES users(id) ON DELETE CASCADE
       )
      `);

    connection.release();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

module.exports = {
  pool,
  initializeDatabase,
};
