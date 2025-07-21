const jwt = require("jsonwebtoken");

const generateToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      isAdmin: user.isadmin,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "7d" }
  );

module.exports = generateToken;
