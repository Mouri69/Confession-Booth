require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const Confession = require('./models/Confession');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI;

console.log('MONGO_URI:', process.env.MONGO_URI);

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

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 