const jwt = require("jsonwebtoken");

const generateToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      mobile: user.mobile,
      dob: user.dob,
      gender: user.gender,
      isAdmin: user.isadmin,
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "7d" }
  );

module.exports = generateToken;
