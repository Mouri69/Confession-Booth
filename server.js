require('dotenv').config();
const cors = require('cors');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const Confession = require('./models/Confession');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;

console.log('MONGO_URI:', process.env.MONGO_URI);

// CORS for Express
app.use(cors({
  origin: 'https://mouri69-confession.vercel.app',
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get all confessions
app.get('/api/confessions', async (req, res) => {
  const confessions = await Confession.find().sort({ timestamp: -1 });
  res.json(confessions);
});

// API endpoint to post a new confession
app.post('/api/confessions', async (req, res) => {
  const { text, userId } = req.body;
  if (!text || !userId) {
    return res.status(400).json({ error: 'Text and userId are required.' });
  }
  try {
    const confession = new Confession({ text, userId });
    await confession.save();
    io.emit('new_confession', confession);
    res.status(201).json(confession);
  } catch (err) {
    console.error('Error saving confession:', err);
    res.status(500).json({ error: 'Failed to save confession.' });
  }
});

// Upvote or downvote a confession
app.post('/api/confessions/:id/vote', async (req, res) => {
  const { vote, userId } = req.body;
  if (![1, -1].includes(vote) || !userId) {
    return res.status(400).json({ error: 'Vote must be 1 or -1 and userId is required.' });
  }
  try {
    const confession = await Confession.findById(req.params.id);
    if (!confession) return res.status(404).json({ error: 'Confession not found.' });
    if (confession.voters && confession.voters.includes(userId)) {
      return res.status(400).json({ error: 'You have already voted.' });
    }
    confession.votes += vote;
    confession.voters = confession.voters || [];
    confession.voters.push(userId);
    await confession.save();
    io.emit('update_confession', confession);
    res.json(confession);
  } catch (err) {
    res.status(500).json({ error: 'Failed to vote.' });
  }
});

// Add a reaction to a confession
app.post('/api/confessions/:id/react', async (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'Emoji is required.' });
  try {
    const confession = await Confession.findById(req.params.id);
    if (!confession) return res.status(404).json({ error: 'Confession not found.' });
    confession.reactions.set(emoji, (confession.reactions.get(emoji) || 0) + 1);
    await confession.save();
    io.emit('update_confession', confession);
    res.json(confession);
  } catch (err) {
    res.status(500).json({ error: 'Failed to react.' });
  }
});

// Add a comment to a confession
app.post('/api/confessions/:id/comment', async (req, res) => {
  const { text, userId } = req.body;
  if (!text || !userId) return res.status(400).json({ error: 'Text and userId are required.' });
  try {
    const confession = await Confession.findById(req.params.id);
    if (!confession) return res.status(404).json({ error: 'Confession not found.' });
    confession.comments.push({ text, userId });
    await confession.save();
    io.emit('update_confession', confession);
    res.json(confession);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

// Delete a confession (admin only)
app.delete('/api/confessions/:id', async (req, res) => {
  const { adminSecret } = req.body;
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    await Confession.findByIdAndDelete(req.params.id);
    io.emit('delete_confession', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete confession.' });
  }
});

// Socket.IO with CORS for Vercel frontend
const io = new Server(server, {
  cors: {
    origin: 'https://mouri69-confession.vercel.app',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 