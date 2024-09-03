const mongoose = require("mongoose");
const listSchema = new mongoose.Schema({
  name: String,
  content: String,
  isPublic: Boolean,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  image: {
    data: Buffer,
    content: String
  }, // Field to indicate visibility
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
views: {
  type: Number,
  default: 0
} ,
tags: [String],  // Array of tags associated with the blog
createdAt: {
  type: Date,
  default: Date.now
}
});

// Create the Blog model
const Blog = mongoose.models.Blog || mongoose.model('Blog', listSchema);
module.exports = Blog;