const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const bcrypt = require("bcryptjs")
const { join } = require("node:path");
const { jwtSecret } = require("../constants");
const User = require("../models/user");
const router = express.Router();


router.get(
  "/self",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    if (req.user) {
      res.send(req.user);
    } else {
      res.status(401).end();
    }
  }
);
router.post("/login", passport.authenticate("local",{session:false}), (req, res) => {
  try {
    const userData = {
      id: req.user.id,
      username: req.user.userna
    };

    const token = jwt.sign({ data: userData }, jwtSecret, {
      expiresIn: "1d", 
    });

    res.cookie("token", token, {
      httpOnly: false, // Prevent client-side access
      secure: true, // Secure in production
      sameSite: "none", // Protect against CSRF
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    res.cookie("user", `${userData.username}-${userData.id}`, {
      httpOnly: false,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    res.status(200).json({
      token,
      user:userData,
      message: "logged in successfully",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "An error occurred during register" });
  }
});
router.post("/register", async(req, res) => {
  try {
    const { username, password, publicKeyJwk,salt } = req.body;
    console.log("req.body",req.body)
    if(!username || !password){
      res.status(400).json({
        message:"username and password is required"
      })
      return
    }
     
    const existingUserRes = await User.getUser(username)
    const existingUser = existingUserRes.user
    console.log(existingUser)
    if(existingUser){
      res.status(400).json({
        message:"User with this username already exists"
      })
      return
    }
    const hashedPassword = await bcrypt.hash(password,10)
  
    const user = await User.create(username,hashedPassword,publicKeyJwk,salt);

    res.status(201).json({
      message:"User created Successfully"
    })
    
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message:"Internal Server Error"
    })
  }
});

module.exports = router;