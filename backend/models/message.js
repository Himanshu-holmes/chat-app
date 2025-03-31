// models/message.js
const { pool } = require("../config/database");

class Message {
  static async create(senderId, receiverId, messageText) {
    const [result] = await pool.query(
      "INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)",
      [senderId, receiverId, messageText]
    );
    return result.insertId;
  }

  static async getConversation(user1Id, user2Id) {
    const [messages] = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
       OR (sender_id = ? AND receiver_id = ?) 
       ORDER BY timestamp`,
      [user1Id, user2Id, user2Id, user1Id]
    );
    return messages;
  }

  static async markAsRead(messageIds) {
    await pool.query("UPDATE messages SET is_read = TRUE WHERE id IN (?)", [
      messageIds,
    ]);
  }
}

module.exports = Message;
