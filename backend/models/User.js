const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,

  // 🔥 ADD THIS
  role: {
    type: String,
    default: "user"
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);