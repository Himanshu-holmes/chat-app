const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/user");


passport.use(
  new LocalStrategy(async(username, password, done) => {
     const response = await User.getUser(username)
     if(!!response.isError){
      
       return done(null,false,{message:response.message})
      }
      const user = response?.user
      console.log("user login",user)
    const isMatch = await bcrypt.compare(password, user?.password);
    console.log("isMatch",isMatch)

    if (!isMatch) {
      return done(null, false, { message: "Incorrect username or password." });
    }
    // If authentication is successful, pass the user object
    return done(null, user);

  })
);

module.exports = passport;
