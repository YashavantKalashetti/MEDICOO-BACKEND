require('dotenv').config()

const mongoose = require("mongoose")
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const SchemaTypes = mongoose.Schema.Types;

const doctorSchema = mongoose.Schema({
    name:{
        type:String,
        required: true
    },
    contactNumber:{
        type: Number,
        min:10,
        required: true
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
    avatar:{
        type: String
    },consultingFees:{
        type: Number,
        default: 500
    },
    affiliatedHospital:{
        type: String,
        ref: 'hospital'
    },
    totalAppointments:{
        type: Number,
        default: 0
    },
    rating:{
        type: mongoose.Decimal128,
        default: 0.0
    },
    prescriptions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'prescription',
      }],
    },{
        toJSON : { virtuals : true},
        toObject: { virtuals: true},
        timestamps: true
    }
)

doctorSchema.pre('save',async function(next){
    if(this.isModified('password')){
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
})

doctorSchema.methods.isPasswordCorrect = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}

doctorSchema.methods.generateAccessToken = async function(){
    const token = await jwt.sign({
        name: this.name,
        holder: "Doctor",
        _id: this._id,
        gender: this.gender
    }, process.env.COOKIE_SIGNATURE, { expiresIn: "5d"})

    return token;
}

doctorSchema.virtual('age').get(function () {
    const today = new Date();
    const birthDate = new Date(this.dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    
    return age;
});

const Doctor = mongoose.model('doctor', doctorSchema)

module.exports = Doctor