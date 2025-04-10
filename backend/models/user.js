
const { pool } = require("../config/database");

class User {
  static async create(username, password, publicKeyJwk,salt) {
    try {
      const [result] = await pool.query(
        "INSERT INTO users (username, password, pubk_jwk,salt) VALUES (?, ?,?, ?)",
        [username, password, JSON.stringify(publicKeyJwk),Buffer.from(salt)]
      );
      return result.insertId;
    } catch (error) {
      console.error(error);
      return "";
    }
  }

  static async getUser(username) {
    try {
      const [user] = await pool.query(`SELECT * FROM users WHERE username=?`, [
        username,
      ]);
      return {
        user: user.length > 0 ? user[0] : null,
        isError: false,
        message: "successfull",
      };
    } catch (error) {
      console.error(error);
      return { user: null, isError: true, message: error.message };
    }
  }
  static async getSalt(id) {
    try {
      const [salt] = await pool.query(
        `
        SELECT salt FROM users WHERE id = ?
        `,
        [id]
      );
      console.log("salt", salt);
      return salt[0]?.salt;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
}

module.exports = User;