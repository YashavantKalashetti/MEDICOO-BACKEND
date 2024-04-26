const mongoose = require('mongoose')

const appointmentSchema = mongoose.Schema({
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
    reason:{
        type: String,
        required: true
    }
},{timeStamps: true})

const Appointment = mongoose.model('appointment', appointmentSchema)

module.exports = Appointment