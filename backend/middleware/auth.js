const jwt = require("jsonwebtoken");

const SECRET = "mysecretkey";

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    req.userId = decoded.userId;
    req.userRole = decoded.role; // 🔥 THIS IS REQUIRED

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};