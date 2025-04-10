const express = require("express");
const { jwtSecret } = require("../constants");
const User = require("../models/user");
const passport = require("passport");
const router = express.Router();

router.get(
  "/search",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { user } = req.query;
      if (!user) {
        res.status(200).json({
          message: "Please provide username",
        });
        return;
      }
      const usrResponse = await User.getUser(user);
      delete usrResponse?.user.password;
      res.status(200).json({
        user: usrResponse.user,
        message: "User retrieved successfully",
      });
    } catch (error) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);
router.get(
  "/salt",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { id } = req?.user;
      if (!id) {
        res.status(400).json({
          message: "Please login again",
        });
        return;
      }
      const salt = await User.getSalt(id)
      if(!salt){
        res.status(400).json({
            message:"GEN"
        })
        return
      }
      res.status(200).json({
        message:"success",
        salt
      })
      return
    } catch (error) {
        console.log(error)
         res.status(500).json({
           message: "Something Went Wrong",
           
         });
    }
  }
);

module.exports = router;
