const express = require('express');
const mongoose = require('mongoose');
const serverless = require('serverless-http');

const app = express();
const setupLogin = require('../login'); // Adjusted path
const setupBlog = require('../blog');   // Adjusted path

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
app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

module.exports = app;
module.exports.handler = serverless(app);
