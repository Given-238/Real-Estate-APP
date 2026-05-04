module.exports = function (req, res, next) {
  if (req.userRole !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

  next();
};