// server.js
require("dotenv").config();
const express = require("express");
const https = require("https");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const { initializeDatabase } = require("./config/database");
const initializeSockets = require("./sockets/socket");
const authRoutes = require("./routes/auth")
const messageRoutes = require("./routes/messageRoutes")
const usrRoutes = require("./routes/user")
const app = express();
const passport = require("./config/passport")
const passportJwt = require("passport-jwt");
const { jwtSecret } = require("./constants");
const path = require("path")


const sslOptions = {
  key: fs.readFileSync(path.join(__dirname,"cert","cert.key")),
  cert: fs.readFileSync(path.join(__dirname,"cert","cert.crt")),
  ca: fs.readFileSync(path.join(__dirname,"cert","ca.crt")),
  // If you have intermediate certificates
  // ca: fs.readFileSync('./certs/ca-chain.pem')
};

const server = https.createServer(sslOptions,app);


// Initialize socket
initializeSockets(server);
app.use(cors({ origin: ["http://localhost:5173","https://192.168.239.195:5173"],credentials:true }));
app.use(express.json());
app.use(cookieParser())

// Security headers
// app.use((req, res, next) => {
//   // HTTP Strict Transport Security
//   res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
//   // Content Security Policy
//   res.setHeader('Content-Security-Policy', "default-src 'self'");
//   // Prevent MIME type sniffing
//   res.setHeader('X-Content-Type-Options', 'nosniff');
//   // Clickjacking protection
//   res.setHeader('X-Frame-Options', 'DENY');
//   // XSS Protection
//   res.setHeader('X-XSS-Protection', '1; mode=block');
//   next();
// });

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
    // console.log("messageROute");
    // console.log("payload",payload)
    return done(null, payload.data);
  })
);


app.use("/auth",authRoutes)
app.use("/message",messageRoutes)
app.use("/user",usrRoutes)

// console.log("users".users);
// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// const http = require("http");

// http
//   .createServer((req, res) => {
//     res.writeHead(301, {
//       Location: "https://" + req.headers["host"] + req.url,
//     });
//     res.end();
//   })
//   .listen(80);