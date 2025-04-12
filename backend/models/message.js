// models/message.js
const { pool } = require("../config/database");

class Message {
  static async create(senderId, receiverId, messageText) {
    const [result] = await pool.query(
      "INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)",
      [senderId, receiverId, JSON.stringify(messageText)]
    );
    return result.insertId;
  }

  static async getConversation(user1Id, user2Id) {
    const [messages] = await pool.query(
      `SELECT 
        messages.id, 
        messages.sender_id, 
        messages.receiver_id, 
        messages.message, 
        messages.timestamp, 
        messages.is_read, 
        users.username AS senderUsername 
      FROM messages 
            LEFT JOIN users on messages.sender_id = users.id
       WHERE (sender_id = ? AND receiver_id = ?) 
       OR (sender_id = ? AND receiver_id = ?) 
       ORDER BY timestamp`,
      [user1Id, user2Id, user2Id, user1Id]
    );
    let sanitisedMessages = [];
    if (messages.length > 0) {
      sanitisedMessages = messages.map(
        ({ id, sender_id, receiver_id, ...rest }) => ({
          messageId: id,
          senderId: String(sender_id),
          receiverId: String(receiver_id),
          ...rest,
        })
      );
    }
    return sanitisedMessages;
  }

  static async markAsRead(messageIds) {
    await pool.query("UPDATE messages SET is_read = TRUE WHERE id IN (?)", [
      messageIds,
    ]);
  }
  static async getUsers(userId) {
    const [users] = await pool.query(
      `SELECT u.id, u.username
   FROM messages m
   JOIN users u ON u.id = 
       CASE 
           WHEN m.sender_id = ? THEN m.receiver_id 
           ELSE m.sender_id 
       END
   WHERE m.sender_id = ? OR m.receiver_id = ?
   GROUP BY u.id, u.username
   ORDER BY MAX(m.timestamp) DESC;`,
      [userId, userId, userId]
    );

    return users;
  }

  static async getSymmetricKey(ownerId, recipientId) {
    const [symKey] = await pool.query(
      `
        SELECT encrypted_key FROM symmetric_key
        WHERE owner = ? AND recipient = ?
      `,
      [ownerId, recipientId]
    );
    return symKey;
  }
  static async createSymmetricKey(ownerId, recipientId, encryptedKey) {
    const [symKey] = await pool.query(
      `
          INSERT INTO symmetric_key (owner,recipient,encrypted_key) VALUES (?,?,?)
      `,
      [ownerId, recipientId, JSON.stringify(encryptedKey)]
    );
    return symKey.insertId;
  }
}

module.exports = Message;
