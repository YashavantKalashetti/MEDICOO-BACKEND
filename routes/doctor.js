require('dotenv').config()

const Doctor = require('../models/doctor.js')

const upload = require('../service/fileUpload.js')

const requireAuth = require('../auth/VerifyToken.js')

const { route } = require('./patient.js');

const { signin, signup, getAppointments, joinMeetingByID, viewPrescriptionById, addPrecriptions,
    deletePrescriptions, changeConsultingFees, changePassword, changeAvatar } = require('../controllers/doctors.js')


const express = require('express')
const router = express.Router()


router.post('/signup',upload.single('avatar'),signin)

router.post('/signin', signup)


// Protected Routes
router.use(requireAuth(Doctor))

// Get access To Todays appointments
router.get('/get-appointments', getAppointments)

router.post('/join-meeting/:id', joinMeetingByID )

router.get('/view-prescriptions/:id', viewPrescriptionById )


// Post Requests

router.post('/add-prescription',upload.single('reportFile'), addPrecriptions)


// Delete prescription In case added mistkenly and this should be verified by patient as well to delete the prescription
router.post('/delete-prescription', deletePrescriptions)

router.post('/change-consultingfees', changeConsultingFees )


// Patch Request
router.patch('/change-password', changePassword )

router.patch('/change-avatar',upload.single('avatar'), changeAvatar)


const handelError = (err)=>{
    console.log(err.message, err.code)
  
    let errors = {email: '', password: ''}
  
    if(err.code === 11000){
        errors.email = "User with this email already exists."
        return errors;
    }
  
    if(err.message.includes('User validation failed')){
        Object.values(err.errors).forEach(({properties})=>{
            errors[properties.path] = properties.message;
        });
    }
    return errors;
}

module.exports = router
