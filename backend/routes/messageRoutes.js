const express = require("express");
const User = require("../models/user");
const passport = require("../config/passport");
const Message = require("../models/message");
const router = express.Router();

router.get(
  "/getUsers",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { id } = req.user;
      if (!id) {
        res.status(401).json({
          message: "Please login again",
        });
        return;
      }
      const userId = id;
      console.log("req.user", req.user);
      const getAllConnectedUsers = await Message.getUsers(userId);
      console.log("connected users", getAllConnectedUsers);
      res.status(200).json({
        users: getAllConnectedUsers,
        message: "retrieved succesfully",
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Internal Server Error",
      });
    }
  }
);

router.get(
  "/getMessages",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { user } = req.query;
      const currentUser = req.user;
      if (!currentUser) {
        res.status(400).json({
          message: "please login again",
        });
        return;
      }
      if (!user) {
        res.status(400).json({
          data: null,
          message: "user is required",
        });
        return;
      }
      const conversation = await Message.getConversation(currentUser?.id, user);
      res.status(200).json({
        data: conversation,
        message: "message retrieved successfull",
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

router.post("/sm-key",passport.authenticate("jwt",{session:false}),async(req,res)=>{
  try {
    const {recipient,smKey,sender} = req.body
    if(!req?.user?.id || !recipient || !smKey || !sender){
      res.status(400).json({
        message:"Bad Request"
      })
      return
    }
    const {id} = req.user
    const isValidReq = String(id) === String(sender) || String(id) === String(recipient)
    if(!isValidReq){
      res.status(400).json({
        message:"Bad Request"
      })
      return
    }
    const symKey = await Message.createSymmetricKey(String(sender),String(recipient),smKey)
    if(!symKey){
      res.status(400).json({
        message: "Something went wrong",
      });
      return;
    }
    res.status(200).json({
      message:"success"
    })

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
})
router.get(
  "/sm-key",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
        const {  senderId,recipientId } = req.query;
        console.log("sm-key: req.user",req.user)
      const {id} = req?.user
      
      const ownerId = String(id)
      console.log("userid ownerid reciepientid",id,ownerId,recipientId)
      if(!recipientId || !senderId){
        console.log(`recipientId ${recipientId} senderId ${senderId}`)
        console.log("recipientId and senderId is required")
        res.status(400).json({
          message: "recipientId and senderId is required",
        });
        return; 
      }
      if(!id ){
        res.status(401).json({
            message:"Bad Request"
        })
        return
      }
      const isValidReq = ownerId === senderId || ownerId === recipientId
      if(!isValidReq){
        res.status(400).json({
          message:"Bad Request"
        })
        return
      }
      const symKey = await Message.getSymmetricKey(senderId, recipientId);
      if (symKey.length === 0) {
        res.status(400).json({
          message: "GEN",
        });
        return;
      }
      const encryptedKey = symKey[0]?.encrypted_key || null;

      res.status(200).json({
        symKey:encryptedKey,
        message:"success"
      })
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

module.exports = router;
