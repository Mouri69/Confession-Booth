const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const ConfessionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  userId: String,
  timestamp: { type: Date, default: Date.now },
  votes: { type: Number, default: 0 },
  reactions: { type: Map, of: Number, default: {} },
  comments: { type: [CommentSchema], default: [] }
});

module.exports = mongoose.model('Confession', ConfessionSchema);
