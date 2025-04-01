
const { pool } = require("../config/database");

class User {
  static async create(username, password) {
   try {
     const [result] = await pool.query(
       "INSERT INTO users (username, password) VALUES (?, ?)",
       [username,password]
     );
     return result.insertId;
   } catch (error) {
    console.error(error)
    return ""
   }
  }

  static async getUser(username) {
   try {
     const [user] = await pool.query(
       `SELECT * FROM users WHERE username=?`,
       [username]
     );
     return {user:user.length>0?user[0]:null,isError:false,message:"successfull"}
   } catch (error) {
        console.error(error)
        return {user:null,isError:true,message:error.message}
   }
  }
}

module.exports = User;