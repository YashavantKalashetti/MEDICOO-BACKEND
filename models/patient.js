require('dotenv').config()

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')

const bcrypt = require('bcrypt')

const patientSchema = new mongoose.Schema({
    name:{
        type:String,
        required: true
    },
    contactNumber:{
        type: Number,
        min:10,
        required: true
    },
    aadharNumber:{
        type: Number,
        unique: [true, "This Aadhar number is already registered"],
        required: [true, "Aadhar number is required"],
        minlength: [12,"Invalid Adhar Number"],
        maxLength: 13
    },
    gender:{
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true
    },
    email:{
        type:String,
        unique: [true,"User with this email alreday exists."],
        required: true,
        lowercase:true,
        trim:true,
    },
    dob:{
        type: Date,
        required: true
    },
    password:{
        type:String,
        required: true,
        minlength: [8,"Minimum password length is 8"]
    },
    address:{
        type:String,
        required: true
    },
    prescriptions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prescription',
      }],
    },
    {
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
      timestamps: true
    }
);

patientSchema.pre('save',async function(next){
    
    if(this.isModified('password')){
        this.password = await bcrypt.hash(this.password,10);
    }
    next();
})

patientSchema.methods.isPasswordCorrect = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password)
}

patientSchema.methods.generateAccessToken = async function(){
    const token = await jwt.sign({
        name: this.name,
        gender: this.gender,
        _id: this._id,
        holder: 'Patient'
    }, process.env.COOKIE_SIGNATURE, {expiresIn: '2d'})

    return token;
}

patientSchema.virtual('age').get(function () {
    const today = new Date();
    const birthDate = new Date(this.dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    
    return age;
});

const Patient = mongoose.model('patient', patientSchema ) 
module.exports = Patient