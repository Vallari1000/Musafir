const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1:27017/campusconnect");

// MODELS
const User = mongoose.model("User", {
  username: String,
  email: String,
  password: String
});

const Poll = mongoose.model("Poll", {
  question: String,
  options: [{ text: String, votes: Number }],
  createdBy: String,
  userId: String   // ✅ ADD THIS
});

const SECRET = "secret123";

// REGISTER
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await User.create({ username, email, password: hashed });
  res.json({ message: "Registered" });
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).send("User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).send("Wrong password");

  const token = jwt.sign({ id: user._id }, SECRET);
  res.json({ token });
});

// CREATE POLL
app.post("/create-poll", async (req, res) => {
  const { question, options } = req.body;

  try {
    const token = req.headers.authorization;

    const decoded = jwt.verify(token, "secret123");
    const user = await User.findById(decoded.id);

    const poll = await Poll.create({
      question,
      options: options.map(o => ({ text: o, votes: 0 })),
      createdBy: user.username,
      userId: user._id   // ✅ SAVE USER ID
    });

    res.json(poll);

  } catch (err) {
    console.log("ERROR:", err); // optional debug
    res.status(401).send("Unauthorized");
  }
});

// GET POLLS
app.get("/polls", async (req, res) => {
  const polls = await Poll.find();
  res.json(polls);
});

// VOTE
app.post("/vote", async (req, res) => {
  const { pollId, optionIndex } = req.body;

  const poll = await Poll.findById(pollId);
  poll.options[optionIndex].votes += 1;
  await poll.save();

  res.json(poll);
});

// PROFILE
app.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, SECRET);
    const user = await User.findById(decoded.id);

    res.json({
      username: user.username,
      email: user.email
    });

  } catch {
    res.status(401).send("Invalid token");
  }
});

// DELETE POLL
app.delete("/delete-poll/:id", async (req, res) => {
  try {
    const token = req.headers.authorization;
    const decoded = jwt.verify(token, "secret123");

    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }

    // ✅ CHECK OWNER
    if (poll.userId != decoded.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Poll.findByIdAndDelete(req.params.id);

    res.json({ message: "Poll deleted" });

  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));