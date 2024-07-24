const express = require('express')


// Multer file upload
const upload = require('../service/fileUpload.js')

const Patient = require('../models/patient.js')
const requireAuth = require('../auth/VerifyToken.js')


const { signin, signup, getNearBy, viewPrescriptions, doctorDetails, doctorDetailsById,
  hospitalDetails, hospitalDetailsById, bookAppointment, paymentCheckout, getAppointments,
  joinMeeting, appointmentReview, changePassword, deletePrescriptionById} = require('../controllers/patients.js')
  


const router = express.Router();

router.post('/signup',signin)

router.post('/signin', signup)

// In case of Emergency this helps to find the nearest hospitals around you.
router.post('/getnearby', getNearBy)

// Protecting the routes
// router.use(requireAuth(Patient))

router.get('/view-prescriptions', viewPrescriptions)

router.get('/doctor-details', doctorDetails)

router.get('/doctor-details/:id', doctorDetailsById)

router.get('/hospital-details',hospitalDetails)

// Get the details of the hospital and the doctors working there.
router.get('/hospital-details/:id', hospitalDetailsById )

router.post('/book-appointment', bookAppointment)

// Stripe Payment Integration
router.post("/create-checkout-session", paymentCheckout)

// Will list all appointments.
router.get('/get-appointments', getAppointments)

router.post('/join-meeting/:id', joinMeeting)

// After the end of the appointment with the doctor the patient can add a rating to corresponding Doctor based on the experirence.
router.post('/appointment-review', appointmentReview)

router.patch('/change-password', changePassword)

// This is used in case the doctor has mistakenly added a prescription and requested to delete the prescription on patient's confirmation
router.delete('/delete-prescription/:id', deletePrescriptionById)

const handelError = (err)=>{
  console.log(err.message, err.code)

  let errors = {email: '', password: ''}

  if(err.code === 11000){
      if(err.keyPattern.aadharNumber){
        errors.email = "User with this Aadhar Number already exists."
      }else{
        errors.email = "User with this Email already exists."
      }
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