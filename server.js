const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// In-memory storage for confessions
let confessions = [];

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get all confessions
app.get('/api/confessions', (req, res) => {
  res.json(confessions);
});

// API endpoint to post a new confession
app.post('/api/confessions', (req, res) => {
  const { text, userId } = req.body;
  if (!text || !userId) {
    return res.status(400).json({ error: 'Text and userId are required.' });
  }
  const confession = {
    id: Date.now().toString(),
    text,
    userId,
    timestamp: new Date(),
    votes: 0,
    reactions: {},
    comments: []
  };
  confessions.unshift(confession); // Add to the top
  io.emit('new_confession', confession);
  res.status(201).json(confession);
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected');
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 