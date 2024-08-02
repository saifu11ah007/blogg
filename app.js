const express = require('express');
const mongoose = require('mongoose');
const app = express();
const setupLogin = require('./login');
const setupBlog = require('./blog');

// Setup mongoose connection
mongoose.connect('mongodb+srv://saifullah22044:Test123@cluster0.svl6zpm.mongodb.net/blog_and_logins')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Could not connect to MongoDB:', err);
    process.exit(1);  // Exit process if connection fails
  });

// Setup login and blog routes
setupLogin(app);
setupBlog(app);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;  // Export the app for Vercel
