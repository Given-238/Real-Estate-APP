const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property"
  }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);