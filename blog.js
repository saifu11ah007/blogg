const express = require ("express");
const path = require('path');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const _ = require("lodash");
const sanitizeHtml = require('sanitize-html'); // Import sanitize-html
const { type } = require("os");
const striptags = require('striptags');
const Blog = require('./blogmodels'); 
const app = express();

function setupBlog(app) {


  const commentSchema = new mongoose.Schema({
    author: String,
    comment: String
  });
  const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);

  // Sample default item
  const defaultItems = [];

  // Insert default items into the database
  Blog.insertMany(defaultItems);
  app.options("", cors({
    origin: "*",
    methods: ["POST", "GET", "DELETE", "PUT"],
    credentials: true
  }));

  app.use(cors({
    origin: "*",
    methods: ["POST", "GET", "DELETE", "PUT"],
    credentials: true
  }));

  // Configure middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
 app.use(express.static(path.join(__dirname, '../public')));

// Set up view engine and views directory
app.set('views', path.join(__dirname, '../views'));
  app.set('view engine', 'ejs');
  app.get('/favicon.ico', (req, res) => res.status(204).end());

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1; // Months are zero-based
  const year = today.getFullYear();

  function renderWithAuthStatus(req, res, view, data = {}) {
    res.render(view, { ...data, isAuthenticated: req.isAuthenticated() });
  }


  app.get('/blog', function (req, res) {
    const tagFilter = req.query.tag ? { tags: req.query.tag, isPublic: true } : { isPublic: true };
  
    Blog.find({})
      .sort({ likes: -1 })
      .limit(5)
      .then((topLikedArticles) => {
        Blog.find({})
          .sort({ views: -1 })
          .limit(5)
          .then((topViewedArticles) => {
            Blog.find(tagFilter)
              .then(foundItems => {
                // Strip HTML tags from the article content for the summary
                foundItems.forEach(item => {
                  item.content = sanitizeHtml(item.content, {
                    allowedTags: [], // Remove all HTML tags
                    allowedAttributes: {}
                  });
                });
  
                res.render("article", {
                  Titles: foundItems,
                  topLikedArticles,
                  topViewedArticles,
                  date: day,
                  month: month,
                  years: year,
                  isAuthenticated: req.isAuthenticated()
                });
              })
              .catch(err => console.error(err));
          })
          .catch(err => {
            console.error("Error fetching top viewed articles:", err);
            res.status(500).send("Internal server error");
          });
      })
      .catch(err => {
        console.error("Error fetching top liked articles:", err);
        res.status(500).send("Internal server error");
      });
  });
  
  
  app.get('/all-blogs', function (req, res) {
    Blog.find({})
      .then(blogs => {
        // Log all blog entries
        res.json(blogs); // Return blogs as JSON for debugging
      })
      .catch(err => {
        console.error('Error fetching blogs:', err);
        res.status(500).send('Error fetching blogs');
      });
  });

  
  app.get("/viewingarticles", function (req, res) {
    if (req.isAuthenticated()) {
      Blog.find({ author: req.user._id })
        .then(articles => {
          // Strip HTML tags from article content
          const sanitizedArticles = articles.map(article => {
            return {
              ...article._doc,
              content: striptags(article.content)
            };
          });
  
          renderWithAuthStatus(req, res, "viewingarticles", { articles: sanitizedArticles, isAuthenticated: req.isAuthenticated() });
        })
        .catch(err => console.error(err));
    } else {
      res.redirect("/login");
    }
  });

  app.get("/:postName", function (req, res) {
    const requestedTitle = req.params.postName;
    console.log("Requested Title:", requestedTitle);
  
    Blog.findOneAndUpdate(
      { name: { $regex: new RegExp(`^${requestedTitle}$`, 'i') } },
      { $inc: { views: 1 } }, // Increment the view count by 1
      { new: true } // Return the updated document
    ).populate('comments')
      .then(item => {
        if (item) {
          console.log("Article Found:", item);
          res.render("viewarticle", {
            Titles: [item],
            date: day,
            month: month,
            years: year,
            isAuthenticated: req.isAuthenticated() 
          });
        }
        // else {
        //   console.log("Post not found");
        //   res.status(404).send("Post not found");
        // }
      })
      .catch(err => {
        console.error("Error finding post:", err);
        res.status(500).send("Internal server error");
      });
  });
  app.get("/", (req, res) => {
    // Fetch top 5 most liked articles
    Blog.find({})
      .sort({ likes: -1 })
      .limit(5)
      .then((topLikedArticles) => {
        // Fetch top 5 most viewed articles
        Blog.find({})
          .sort({ views: -1 })
          .limit(5)
          .then((topViewedArticles) => {
            // Render the home page with the top articles and auth status
            renderWithAuthStatus(req, res, "home", {
              topLikedArticles,
              topViewedArticles,
            });
          })
          .catch((err) => {
            console.error("Error fetching top viewed articles:", err);
            res.status(500).send("Internal server error");
          });
      })
      .catch((err) => {
        console.error("Error fetching top liked articles:", err);
        res.status(500).send("Internal server error");
      });
  });

  

  app.post('/submitarticle', function (req, res) {
    const itemName = req.body.blogTitle;
  
    // Sanitize the content before saving it to the database
    const sanitizedContent = sanitizeHtml(req.body.content, {
      allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li'],
      allowedAttributes: {
        'a': ['href']
      }
    });
  
    const visibility = req.body.visibility;
    const isPublic = visibility === "public";
    const tags = req.body.tags || []; // Capture the selected tags
  
    const item = new Blog({
      name: itemName,
      content: sanitizedContent,
      isPublic: isPublic,
      author: req.user._id,
      tags: Array.isArray(tags) ? tags.slice(0, 3) : [tags] // Ensure tags are stored as an array, max 3
    });
  
    item.save()
      .then(() => res.redirect("/blog"))
      .catch(err => console.error(err));
  });
  
  
  
  app.post("/blog/:id/comments", function (req, res) {
    if (req.isAuthenticated()) {
      const user = req.user;
      // console.log(req.params.id);
      // console.log(req.body.comment);
      const comment = new Comment({
        author: user.username,
        comment: req.body.comment
      });
      comment.save()
        .then((result) => {
          console.log('Saved Comment:', result);
          Blog.findById(req.params.id)
            .then((blogs) => {
              console.log(blogs.comments);
              blogs.comments.push(result);
              blogs.save();
              console.log("==comments==");
              console.log(blogs.comments);
              res.redirect('/');
            })
            .catch(err => console.error(err));
        })
        .catch(err => console.error(err));;

    }
    else { res.redirect("/login"); }
  });
  app.get('/roots', function(req, res) {
    res.send('This is a new route.');
    console.log("root");
  });
  app.post("/like", function (req, res) {
    if (req.isAuthenticated()) {
      Blog.findByIdAndUpdate(
        req.body.postId,
        { $addToSet: { likes: req.user._id } }, // Use $addToSet to avoid duplicates
        { new: true }
      )
        .then(result => {
          console.log('Article liked successfully');
          res.redirect("/blog");
        })
        .catch(err => {
          console.log(err);
          res.status(500).send('Internal Server Error');
        });
    } else { res.redirect("/login"); }
  });
  
  app.post("/unlike", function (req, res) {
    if (req.isAuthenticated()) {
      Blog.findByIdAndUpdate(
        req.body.postId,
        { $pull: { likes: req.user._id } },
        { new: true }
      )
        .then(result => {
          console.log('Article unliked successfully');
          res.redirect("/blog");
        })
        .catch(err => {
          console.log(err);
          res.status(500).send('Internal Server Error');
        });
    } else { res.redirect("/login"); }
  });
  

}

module.exports = setupBlog;
