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

router.get(
  "/sm-key",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
        const { ownerId, recipientId } = req.query;
      const {id} = req.user
      
      console.log("userid ownerid reciepientid",typeof(id),typeof(ownerId),typeof(recipientId))
      if(String(id) !== ownerId){
        res.status(400).json({
            message:"Bad Request"
        })
        return
      }
      const symKey = await Message.getSymmetricKey(ownerId, recipientId);
      if (symKey.length === 0) {
        res.status(400).json({
          message: "GEN",
        });
        return;
      }
      res.status(200).json({
        symKey,
        message:"success"
      })
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

module.exports = router;
