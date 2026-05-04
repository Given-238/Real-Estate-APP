const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  checkIn: Date,
  checkOut: Date,
  totalPrice: Number
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);