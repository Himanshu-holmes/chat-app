
const passport = require("passport");
const passportJwt = require("passport-jwt");
const { jwtSecret } = require("../constants");
// const JwtStrategy = passportJwt.Strategy;
// const ExtractJwt = passportJwt.ExtractJwt;

// const jwtDecodeOptions = {
//   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//   secretOrKey: jwtSecret,
//   // issuer: "accounts.examplesoft.com",
//   // audience: "yoursite.net",
// };

// passport.use(
//   new JwtStrategy(jwtDecodeOptions, (payload, done) => {
//     return done(null, payload.data);
//   })
// );
