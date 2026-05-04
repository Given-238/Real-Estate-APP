const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  rating: Number,
  comment: String
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);