const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'ai', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  model: {
    type: String,
    default: null
  },
  fileUrl: {
    type: String,
    default: null
  },
  imageUrls: {
    type: [String],
    default: []
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', messageSchema);
