const mongoose=require('mongoose');
const imageSchema=mongoose.Schema({
  name:{
    type: String,
    required:true
  },
  image:{
    data: Buffer,
    content: String
  }
});
module.exports=ImageModel=mongoose.model('imagemodel', imageSchema);