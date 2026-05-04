const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  title: String,
  price: Number,
  location: String,
  type: String,

  image: String, // (you can keep this for backward compatibility)

  images: {
    type: [String],
    default: []
  },

  description: String,

  favorites: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

module.exports = mongoose.model("Property", propertySchema);

blockedDates: [
  {
    start: Date,
    end: Date
  }
]
