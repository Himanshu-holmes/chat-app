const socketIo = require("socket.io");
const Message = require("../models/message");
const passport = require("../config/passport");

const passportJwt = require("passport-jwt");

const { userStatus } = require("../config/redis");
const { jwtSecret } = require("../constants");


const JwtStrategy = passportJwt.Strategy;
const ExtractJwt = passportJwt.ExtractJwt;

const jwtDecodeOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: jwtSecret,
  // issuer: "accounts.examplesoft.com",
  // audience: "yoursite.net",
};

passport.use(
  new JwtStrategy(jwtDecodeOptions, (payload, done) => {
    return done(null, payload.data);
  })
);



const initializeSockets = (server) => {
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

io.on("connection",async (socket) => {
  console.log("New client connected");
  console.log("users socket id", socket.id);
  console.log("user", socket.request.user);
  let userId =socket.request.user.id
  // Store user when they authenticate
    await userStatus.setOnline(userId,socket?.id);
  
  // socket.on("authenticate", async (userId) => {
  //   socket.userId = userId;
  //   // users.set(userId, socket.id); // Store userId -> socketId

  //   // socket.broadcast.emit("user_online", userId);
  // });

  // Search for a user by userId
  socket.on("searchUser", async(userToSearch) => {
    console.log("Searched user:", userToSearch);
    // const receiverSocketId = users.get(userId);
    const receiverSocketId = await userStatus.getUserSocketId(userToSearch)
  console.log("reciewver socket id ")
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("private_message", {
        id: "messageId",
        senderId: userId,
        message: "hello",
      });
    } else {
      console.log("User not found or offline");
    }
  });

  // Private messaging
  socket.on("private_message", async (data) => {
    const { senderId, receiverId, message } = data;
    console.log("got new msg from", senderId, "to", receiverId, "msg", message);

    try {
      const messageId = await Message.create(senderId, receiverId, message);
      // const receiverSocketId = users.get(receiverId);
      const receiverSocketId = await userStatus.getUserSocketId(receiverId)

      if (receiverSocketId) {
        // io.to(receiverSocketId).emit("new_message", {
        //   id: messageId,
        //   senderId,
        //   message,
        // });
        io.to(receiverSocketId).emit("private_message", {
          id: "messageId",
          senderId: userId,
          message: message,
        });
      }
      socket.emit("message_sent", { id: messageId });
    } catch (error) {
      console.error("Message sending error:", error);
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });
 socket.on("user:status",async(userIdToCheck)=>{
    console.log("userId to check status",userIdToCheck)
    const status = await userStatus.isOnline(userIdToCheck);
    socket.emit("user:status_res",{id:userId,isOnline:status})
 })
  // Handle disconnect
  socket.on("disconnect", async () => {
    if (socket.userId) {
      await userStatus.setOffline(socket.userId);
      socket.broadcast.emit("user_offline", socket.userId);
    }
    console.log("Client disconnected");
  });
});
}

module.exports = initializeSockets