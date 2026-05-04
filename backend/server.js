const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const Review = require("./models/Review");

const stripe = require("stripe")("sk_test_51TRERELcG91x2DA9V0NwEYKiv5Qv85zRmMqBmUacPzlet9pk24UysVhtGbGYCcsP0nIaftgl8gCBdARg6FbBkeZ700OXXYoBQb");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");

const Booking = require("./models/Booking");

const Property = require("./models/Property");
const User = require("./models/User");
const Favorite = require("./models/Favorite");
const Message = require("./models/Message");

const auth = require("./middleware/auth");
const admin = require("./middleware/admin");
const cloudinary = require("./config/cloudinary");

const app = express();
const SECRET = "mysecretkey";

function calculatePrice(property, start, end) {
  let totalPrice = 0;
  let current = new Date(start);

  while (current < end) {
    const day = current.getDay();
    const month = current.getMonth();

    let dailyPrice = property.price;

    // Weekend pricing
    if (day === 0 || day === 6) dailyPrice *= 1.2;

    // December surge
    if (month === 11) dailyPrice *= 1.5;

    totalPrice += dailyPrice;

    current.setDate(current.getDate() + 1);
  }

  const days = (end - start) / (1000 * 60 * 60 * 24);

  // Long stay discount
  if (days >= 7) totalPrice *= 0.9;

  return Math.round(totalPrice);
}

// =======================
// MIDDLEWARE
// =======================
app.use(cors());
app.use("/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// =======================
// DATABASE
// =======================
mongoose.connect(
  "mongodb://realestate_user:Test1234@ac-uk1srac-shard-00-00.npjubc6.mongodb.net:27017,ac-uk1srac-shard-00-01.npjubc6.mongodb.net:27017,ac-uk1srac-shard-00-02.npjubc6.mongodb.net:27017/realestate?ssl=true&replicaSet=atlas-r5r8ap-shard-0&authSource=admin&retryWrites=true&w=majority"
)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

// =======================
// TEST ROUTE
// =======================
app.get("/", (req, res) => {
  res.send("API is running...");
});

// =======================
// PROPERTY ROUTES
// =======================
app.post("/properties", async (req, res) => {
  try {
    const property = new Property(req.body);
    await property.save();
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/properties", async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/properties/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid property ID" });
    }

    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(property);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// IMAGE UPLOAD
// =======================
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path);
    fs.unlinkSync(req.file.path);

    res.json({ imageUrl: result.secure_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// AUTH
// =======================
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashed,
      role: "user"
    });

    await user.save();

    res.json({ message: "User registered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      SECRET
    );

    res.json({ token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =======================
// FAVORITES
// =======================
app.post("/favorites", auth, async (req, res) => {
  try {
    const existing = await Favorite.findOne({
      userId: req.userId,
      propertyId: req.body.propertyId
    });

    // 🔴 If already exists → remove (UNFAVORITE)
    if (existing) {
      await Favorite.deleteOne({ _id: existing._id });
      return res.json({ liked: false });
    }

    // 🟢 If not exists → add favorite
    const favorite = new Favorite({
      userId: req.userId,
      propertyId: req.body.propertyId
    });

    await favorite.save();

    res.json({ liked: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/favorites", auth, async (req, res) => {
  try {
    const favorites = await Favorite.find({ userId: req.userId })
      .populate("propertyId");

    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// CONTACT MESSAGES
// =======================
app.post("/messages", async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();

    res.json({ success: true, message: "Message sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// ADMIN ROUTES
// =======================

// GET ALL PROPERTIES
app.get("/admin/properties", auth, admin, async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE PROPERTY
app.delete("/admin/properties/:id", auth, admin, async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.json({ message: "Property deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE PROPERTY
app.put("/admin/properties/:id", auth, admin, async (req, res) => {
  try {
    const updated = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET MESSAGES (ADMIN)
app.get("/admin/messages", auth, admin, async (req, res) => {
  try {
    const messages = await Message.find().populate("propertyId");
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// BOOKINGS
// =======================

app.post("/bookings", auth, async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut } = req.body;

    if (!propertyId || !checkIn || !checkOut) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (end <= start) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // 🔥 EXISTING BOOKINGS
    const existingBookings = await Booking.find({ propertyId });

    // 🔥 MERGE BLOCKED DATES
    const allBlocked = [
      ...existingBookings.map(b => ({
        start: new Date(b.checkIn),
        end: new Date(b.checkOut)
      })),
      ...(property.blockedDates || []).map(b => ({
        start: new Date(b.start),
        end: new Date(b.end)
      }))
    ];

    // 🔥 CHECK OVERLAP
    const isOverlapping = allBlocked.some(b => {
      return start <= b.end && end >= b.start;
    });

    if (isOverlapping) {
      return res.status(400).json({
        message: "These dates are already booked"
      });
    }

    // 💰 SMART PRICING
    const totalPrice = calculatePrice(property, start, end);

    const booking = new Booking({
      userId: req.userId,
      propertyId,
      checkIn: start,
      checkOut: end,
      totalPrice
    });

    await booking.save();

    res.json({ success: true, booking, totalPrice });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET BOOKINGS
app.get("/bookings/:propertyId", async (req, res) => {
  try {
    const bookings = await Booking.find({
      propertyId: req.params.propertyId
    });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// STRIPE PAYMENT
// =======================

app.post("/create-payment", auth, async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut } = req.body;

    const property = await Property.findById(propertyId);

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    const totalPrice = calculatePrice(property, start, end);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",

      line_items: [{
        price_data: {
          currency: "zar",
          product_data: {
            name: property.title
          },
          unit_amount: totalPrice * 100
        },
        quantity: 1
      }],

      metadata: {
        userId: req.userId,
        propertyId,
        checkIn,
        checkOut,
        totalPrice
      },

      success_url: "http://127.0.0.1:5500/success.html",
      cancel_url: "http://127.0.0.1:5500/cancel.html"
    });

    res.json({ url: session.url });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// WEBHOOK (STRIPE)
// =======================
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      "whsec_d3a2a40e15c19f4cde3f77fc676e4ca359e6e6e71d7d5fbf4dbd77001d0858b7"
    );
  } catch (err) {
    console.log("❌ Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ PAYMENT SUCCESS
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const {
      userId,
      propertyId,
      checkIn,
      checkOut,
      totalPrice
    } = session.metadata;

    try {
      // 🔥 PREVENT DUPLICATES
      const exists = await Booking.findOne({
        userId,
        propertyId,
        checkIn,
        checkOut
      });

      if (!exists) {
        await Booking.create({
          userId,
          propertyId,
          checkIn,
          checkOut,
          totalPrice
        });

        console.log("✅ Booking created after payment");
      }

    } catch (err) {
      console.log("Booking error:", err);
    }
  }

  res.json({ received: true });
});

app.post("/admin/block-dates", auth, admin, async (req, res) => {
  const { propertyId, start, end } = req.body;

  const property = await Property.findById(propertyId);

  property.blockedDates.push({ start, end });

  await property.save();

  res.json({ success: true });
});

// =======================
// START SERVER
// =======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

app.post("/admin/block-dates", auth, admin, async (req, res) => {
  const { propertyId, start, end } = req.body;

  const property = await Property.findById(propertyId);

  property.blockedDates.push({ start, end });

  await property.save();

  res.json({ success: true });
});

app.put("/admin/properties/:id", auth, admin, async (req, res) => {
  try {
    if (!req.body.title || !req.body.price) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const updated = await Property.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(updated);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/my-bookings", auth, async (req, res) => {
  try {
    const bookings = await Booking.find({
      userId: req.userId
    }).populate("propertyId");

    res.json(bookings);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/reviews", auth, async (req, res) => {
  const { propertyId, rating, comment } = req.body;

  const existing = await Review.findOne({
    userId: req.userId,
    propertyId
  });

  if (existing) {
    return res.status(400).json({
      message: "You already reviewed this property"
    });
  }

  const review = new Review({
    userId: req.userId,
    propertyId,
    rating,
    comment
  });

  await review.save();

  res.json(review);
});

app.get("/reviews/:propertyId", async (req, res) => {
  try {
    const reviews = await Review.find({
      propertyId: req.params.propertyId
    }).populate("userId", "email");

    res.json(reviews);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});