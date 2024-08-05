// Import necessary modules
require('dotenv').config();
const express = require("express");
const path = require('path');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const MongoStore = require('connect-mongo'); // Import connect-mongo

function setupLogin(app) {

  // Setup middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '../public')));

  // Set up view engine and views directory
  app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'ejs');
  app.get('/favicon.ico', (req, res) => res.status(204).end());
  app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 3300000 // 5 minutes
    },
    store: MongoStore.create({
      mongoUrl: 'mongodb+srv://saifullah22044:Test123@cluster0.svl6zpm.mongodb.net/sessions',
      autoRemove: 'interval',
      autoRemoveInterval: 10
    }),
    rolling: false
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Update the user schema to include the name field
  const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    name: String // Add this field to store the user's name
  });

  userSchema.plugin(passportLocalMongoose);
  userSchema.plugin(findOrCreate);
  const User = mongoose.models.User || mongoose.model('User', userSchema);


  passport.use(User.createStrategy());
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(async function (id, done) {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  ));

  // Use a helper function to pass isAuthenticated status to views
  function renderWithAuthStatus(req, res, view, options = {}) {
    res.render(view, { isAuthenticated: req.isAuthenticated(), ...options });
  }

  app.use((req, res, next) => {
    if (!req.session.createdAt) {
      req.session.createdAt = new Date();
      // console.log(`Session created at: ${req.session.createdAt}`);
      // console.log(`Session will expire in: ${req.session.cookie.maxAge / 60000} minutes`);
    }
    next();
  });

  // Log session access
  app.use((req, res, next) => {
    // console.log(`Session accessed at: ${new Date()}`);
    // console.log(`Session data: `, req.session);
    next();
  });

  // Protected route example
  app.get('/protected', (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('Session expired or not authenticated.');
      return res.redirect('/login');
    }
    res.send('This is a protected route');
  });

  app.get("/", function (req, res) {
    renderWithAuthStatus(req, res, "home");
  });

  app.get("/login", function (req, res) {
    renderWithAuthStatus(req, res, "login");
  });

  app.get("/about", function (req, res) {
    renderWithAuthStatus(req, res, "about");
  });

  app.get('/logout', function (req, res, next) {
    req.logout(function (err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

  app.get("/register", function (req, res) {
    renderWithAuthStatus(req, res, "register");
  });

  app.get("/auth/google", passport.authenticate("google", { scope: ['profile'] }));
  app.get("/auth/google/secrets", passport.authenticate("google", { failureRedirect: "/login" }), function (req, res) {
    res.redirect("/submitarticle"); // Change it to where you want to go
  });

  app.get("/submitarticle", function (req, res) {
    if (req.isAuthenticated()) {
      renderWithAuthStatus(req, res, "submitarticle");
    } else {
      res.redirect("/login");
    }
  });

  app.get("/account", function (req, res) {
    if (req.isAuthenticated()) {
      // Assuming your User model has fields for username, name, and email
      const user = req.user; // This should contain the authenticated user's details
      renderWithAuthStatus(req, res, "account", {
        username: user.username,
        fname: user.name || '', // Correctly access the 'name' field
        email: user.email
      });
    } else {
      res.redirect("/login");
    }
  });

  app.post("/register", function (req, res) {
    const id = req.body.username;
    const pass = req.body.password;
    const name = req.body.name; // Get the name from the request

    User.register({ username: id, name: name }, pass) // Store the name during registration
      .then((foundUser) => {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/submitarticle");
        });
      })
      .catch(err => {
        console.error(err);
        res.redirect("/register");
      });
  });

  app.post("/login", function (req, res) {
    const id = req.body.username;
    const pass = req.body.password;
    const user = new User({
      username: id,
      password: pass
    });

    req.login(user, function (err) {
      if (err) {
        console.log(err);
        res.redirect("/login");
      } else {
        passport.authenticate("local", {
          successRedirect: "/submitarticle",
          failureRedirect: "/login"
        })(req, res);
      }
    });
  });

}

module.exports = setupLogin;
