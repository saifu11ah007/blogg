const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer= require('multer');
const app=express();

const ImageModel=require('./image.model')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb://localhost:27017/image')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));
const Storage=multer.diskStorage({
  destination: 'upload',
  filename: (req, file, cb) =>{
    cb(null, file.originalname)
  }
});
const upload=multer({storage: Storage}).single('testImage')

app.get('/', function(req, res){res.send("upload");});
app.post('/upload', function(req, res){
  upload(req, res, (err )=>{
    if(err){console.log(err);}
    else{
      const newImage=new ImageModel({
        name:req.body.name,
        image:{
          data:req.file.filename,
          contentType:'image/png'
        }
      });
      newImage.save()
      .then(() => console.log('added successfully'))
      .catch(err => console.error('Could not cadd:', err));
    }
  });
});
app.listen(3000, () => {
  console.log('Server has started running on port 3000');
});
