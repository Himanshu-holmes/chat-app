const express = require("express");
const jwt = require("jsonwebtoken");
const passport = require("passport");

const { join } = require("node:path");
const { jwtSecret } = require("../constants");
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
router.post("/login", (req, res) => {
  if (req.body.username === "john" && req.body.password === "changeit") {
    console.log("authentication OK");

    const user = {
      id: 1,
      username: "john",
    };

    const token = jwt.sign(
      {
        data: user,
      },
      jwtSecret,
      {
        // issuer: "accounts.examplesoft.com",
        // audience: "yoursite.net",
        expiresIn: "1h",
      }
    );

    res.json({ token });
  } else {
    console.log("wrong credentials");
    res.status(401).end();
  }
});

module.exports = router;