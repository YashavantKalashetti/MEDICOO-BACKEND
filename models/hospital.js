require('dotenv').config()
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  contactNumber: {
    type: Number,
    min:10,
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
  },
  password : {
    type: String,
    minlength: [8 , "Min password length is 8"]
  },
  address: {
    type: String,
    required: true
  },
  location: {
    type: {
        type: String,
        default: 'Point',
    },
    coordinates: [Number],
  },
  // doctors:{
  //   type: [mongoose.Schema.Types.ObjectId],
  //   ref: 'doctor'
  // }
});

hospitalSchema.index({ location: '2dsphere' });

hospitalSchema.pre('save',async function(next){
  if(this.isModified('password')){
    this.password = await bcrypt.hash(this.password, 10)
  }

  next()
})

hospitalSchema.methods.isPasswordCorrect = async function(enteredPassword){
  return await bcrypt.compare(enteredPassword, this.password)
}

hospitalSchema.methods.generateAccessToken = async function(){
  const token = await jwt.sign({
    name: this.name,
    holder: "Hospital",
    _id: this._id,
  }, process.env.COOKIE_SIGNATURE, { expiresIn: "5d"})

  return token;
}

const Hospital = mongoose.model('hospital', hospitalSchema);

module.exports = Hospital;
