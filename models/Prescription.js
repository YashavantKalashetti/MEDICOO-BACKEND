const mongoose = require('mongoose')

const prescriptionSchema = mongoose.Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'patient',
        required: true
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'doctor',
        required: true
    },
    date:{
        type: Date,
        default: Date.now()
    },
    medications : [{
        medicine: String,
        dosage: String,
        instruction: String,
        numberOfDays:{
            type: Number,
            default: 1
        }
    }],
    attachment:{
        type: String
    },
    instructionForOtherDoctor:{
        type: String,
    },
    medicationType:{
        type: String,
        enum: [ 'Normal', "Important" ],
        default: 'Normal'
    },
    status:{
        // This helps in case the document need to be deleted (i.e if prescription was mistakenly added or enterend wrong Info)
        type: String,
        enum: ['Active','InActive'],
        default: "Active"
    }
},{timeStamps: true})

const Prescription = mongoose.model('prescription', prescriptionSchema)

module.exports = Prescription