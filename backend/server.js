// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { initializeDatabase } = require("./config/database");
const initializeSockets = require("./sockets/socket");
const authRoutes = require("./routes/auth")
const messageRoutes = require("./routes/messageRoutes")
const usrRoutes = require("./routes/user")
const app = express();
const server = http.createServer(app);
const passport = require("./config/passport")
const passportJwt = require("passport-jwt");
const { jwtSecret } = require("./constants");

// Initialize socket
initializeSockets(server);
app.use(cors({ origin: "http://localhost:5173",credentials:true }));
app.use(express.json());
app.use(cookieParser())

// Initialize database
initializeDatabase();



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
    console.log("messageROute");
    console.log("payload",payload)
    return done(null, payload.data);
  })
);


app.use("/auth",authRoutes)
app.use("/message",messageRoutes)
app.use("/user",usrRoutes)

console.log("users".users);
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
