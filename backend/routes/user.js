const express = require("express")
const { jwtSecret } = require("../constants");
const User = require("../models/user");
const passport = require("passport");
const router = express.Router();

router.get("/search",passport.authenticate("jwt",{session:false}),async(req,res)=>{
    try {
        const {user} = req.query;
        const usrResponse = await User.getUser(user);
        delete usrResponse?.user.password
        res.status(200).json({
            user:usrResponse.user,
            message:"User retrieved successfully"
        })
    } catch (error) {
        res.status(500).json({message:"Internal Server Error"})
    }
})

module.exports = router