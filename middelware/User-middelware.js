const jwt = require("jsonwebtoken");

const UserMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");
  // console.log("🔥 Incoming Auth Header:", authHeader);
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(400)
      .json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];
  // console.log("Token received:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = {
      _id: decoded.userId,
      ...decoded,
    };

    // console.log(" Final req.user -->", req.user);
    // req.user = decoded;
    // console.log("✌️decoded --->", decoded);
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    res.status(401).json({ message: "Invalid token." });
  }
};

module.exports = UserMiddleware;
