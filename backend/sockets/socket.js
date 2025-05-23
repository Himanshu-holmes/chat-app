const socketIo = require("socket.io");
const Message = require("../models/message");
const passport = require("../config/passport");

const passportJwt = require("passport-jwt");

const { userStatus } = require("../config/redis");
const { jwtSecret } = require("../constants");

const JwtStrategy = passportJwt.Strategy;
const ExtractJwt = passportJwt.ExtractJwt;
// const users = new Map(); // Store userId -> socketId
const jwtDecodeOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtSecret,
  // issuer: "accounts.examplesoft.com",
  // audience: "yoursite.net",
};

const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();
const initializeSockets = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "https://192.168.239.195:5173",
      methods: ["GET", "POST"],
    },
  });

  io.engine.use((req, res, next) => {
    const isHandshake = req._query.sid === undefined;
    if (isHandshake) {
      passport.authenticate("jwt", { session: false })(req, res, next);
    } else {
      next();
    }
  });
  // Socket.IO connection handler
  const users = new Map(); // Store userId -> socketId

  io.on("connection", async (socket) => {
    console.log("New client connected");
    console.log("users socket id", socket.id);
    // console.log("user", socket.request.user);
    let currentUser = socket.request.user
    let userId = socket.request.user.id;
    let currentUsername = socket.request?.user?.username;
    
    
    // Store user when they authenticate
    await userStatus.setOnline(currentUsername, socket?.id);
    
    // Search for a user by userId
    socket.on("searchUser", async (userToSearch) => {
      console.log("Searched user:", userToSearch);
      // const receiverSocketId = users.get(userId);
      const receiverSocketId = await userStatus.getUserSocketId(userToSearch);
      console.log("reciewver socket id ");
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("private_message", {
          id: "messageId",
          senderId: userId,
          username:currentUsername,
          message: "hello",
        });
      } else {
        console.log("User not found or offline");
      }
    });

    // Private messaging
    socket.on("private_message", async (data) => {
      console.log("private msg data",data)
      const { sndData, rcvData, message } = data;
      console.log(
        "got new msg from",
        sndData,
        "to",
        rcvData,
        "msg",
        message
      );

      try {
        const messageId = await Message.create(sndData?.id, rcvData.id, message);
        console.log("messageId",messageId)
        // const receiverSocketId = users.get(receiverId);
        const receiverSocketId = await userStatus.getUserSocketId(rcvData?.username);

        if (receiverSocketId) {
          // io.to(receiverSocketId).emit("new_message", {
          //   id: messageId,
          //   senderId,
          //   message,
          // });
          io.to(receiverSocketId).emit("private_message", {
            messageId,
            senderId: userId,
            byUser:currentUser,
            message: message,
          });
        }
        socket.emit("message_sent", { id: messageId });
      } catch (error) {
        console.error("Message sending error:", error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });
    socket.on("user:status", async (userIdToCheck) => {
      console.log("userId to check status", userIdToCheck);
      const userIdToCheckstatus = await userStatus.isOnline(userIdToCheck);
      const userSocket = await userStatus.getUserSocketId(userId);
      const receiverSocket = await userStatus.getUserSocketId(userIdToCheck);
      await userStatus.getUserSocketId();
      io.to(userSocket).emit("user:status_res", {
        id: userIdToCheck,
        isOnline: userIdToCheckstatus,
      });
      io.to(receiverSocket).emit("user:status_res", {
        id: userId,
        isOnline: true,
      });
      // socket.to(receiverSocket).emit("user:status_res",{id:userId,isOnline:status})
    });
    // Handle disconnect
    socket.on("disconnect", async () => {
      if (currentUsername) {
        await userStatus.setOffline(currentUsername);
        socket.broadcast.emit("user_offline", currentUser);
      }
      console.log("Client disconnected");
    });

    // video call
    
socket.on(
  "join-room",
  ({ roomId, userId }) => {
    console.log(`User ${userId} is trying to join room:`, roomId); // ✅ Debugging log

    if (!roomId || !userId) {
      console.log("Invalid join-room request", { roomId, userId });
      return;
    }

    socket.join(roomId);
    users[socket.id] = { roomId, userId };

    console.log(`User ${userId} joined room:`, roomId);

    socket.to(roomId).emit("user-connected", { userId, socketId: socket.id });
  }
);

socket.on(
  "offer",
  ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer, sender: socket.id });
    console.log(`Sending offer to room ${roomId}`, { offer, sender: socket.id }); // ✅ Debugging log
  }
);

socket.on(
  "answer",
  ({
    answer,
    roomId,
  }) => {
    socket.to(roomId).emit("answer", { answer, sender: socket.id });
    console.log(`Sending answer to room ${roomId}`, { answer, sender: socket.id }); // ✅ Debugging log
  }
);

socket.on(
  "ice-candidate",
  ({
    candidate,
    roomId,
  }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, sender: socket.id });
    console.log(`Sending ICE candidate to room ${roomId}`, { candidate, sender: socket.id }); // ✅ Debugging log
  }
);
  });
};

module.exports = initializeSockets;
