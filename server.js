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
  options: [{ text: String, votes: Number }]
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

  const poll = await Poll.create({
    question,
    options: options.map(o => ({ text: o, votes: 0 }))
  });

  res.json(poll);
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
  if (!poll) return res.status(404).send("Poll not found");

  poll.options[optionIndex].votes += 1;
  await poll.save();

  res.json(poll);
});



// GET USER PROFILE
app.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization;

    const decoded = jwt.verify(token, "secret123");

    const user = await User.findById(decoded.id);

    res.json({
      username: user.username,
      email: user.email
    });

  } catch (err) {
    res.status(401).send("Invalid token");
  }
});

// ✅ DELETE POLL (FULLY WORKING)
app.delete("/delete-poll/:id", async (req, res) => {
  console.log("DELETE REQUEST:", req.params.id);

  try {
    const deleted = await Poll.findByIdAndDelete(req.params.id);

    if (!deleted) {
      console.log("Poll NOT found");
      return res.status(404).json({ message: "Poll not found" });
    }

    console.log("Poll deleted:", deleted);
    res.json({ message: "Poll deleted successfully" });

  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ message: "Error deleting poll" });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));