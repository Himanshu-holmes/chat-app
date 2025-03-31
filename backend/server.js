// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");

const cors = require("cors");


const { initializeDatabase } = require("./config/database");


const initializeSockets = require("./sockets/socket");
const authRoutes = require("./routes/auth")

const app = express();
const server = http.createServer(app);
initializeSockets(server);


app.use(cors({ origin:'*' }));
app.use(express.json());

// Initialize database
initializeDatabase();

// Initialize socket


app.use("/auth",authRoutes)


console.log("users".users);
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
