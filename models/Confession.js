const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  userId: String,
  nickname: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});

const ConfessionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  userId: String,
  nickname: String,
  timestamp: { type: Date, default: Date.now },
  votes: { type: Number, default: 0 },
  reactions: { type: Map, of: Number, default: {} },
  comments: { type: [CommentSchema], default: [] },
  voters: { type: [String], default: [] }
});

module.exports = mongoose.model('Confession', ConfessionSchema);
