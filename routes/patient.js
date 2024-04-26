const express = require('express')
const mongoose = require('mongoose')
const { isEmail } =require('validator')

// Multer file upload
const upload = require('../service/fileUpload.js')

const Patient = require('../models/patient.js')
const requireAuth = require('../auth/VerifyToken.js')
const UpdatePassword = require('../service/UpdatePassword.js')
const Prescription = require('../models/Prescription.js')
const AccessPermission = require('../auth/AccessPermission.js')
const Doctor = require('../models/doctor.js')
const Appointment = require('../models/appointment.js')
const Hospital = require('../models/hospital.js')


const router = express.Router();

router.post('/signup',async (req,res)=>{

    const {name, email, password, contactNumber, gender, address, dob, aadharNumber} = req.body

    if([name, email, password, contactNumber, gender, address, dob, aadharNumber].some((entry)=> entry?.trim ==='' )){
      return res.status(400).json({error : "Enter all the credentails correctly"})
    }

    if(!isEmail(email)){
      return res.status(400).json({error : "Enter a valid Email"})
    }

    try {
      const registeredUser = await Patient.create({
        name, email, password, contactNumber, gender, address, dob, aadharNumber
      })

      if(!registeredUser){
        return res.status(400).json({error : "Account was not created Try again"})
      }

      return res.status(201).json( { msg : "Account as been created successfully", user : registeredUser.name } )

    } catch (error) {
      const { email, password} = handelError(error)
      return res.status(409).json({error : email ? email : password ? password : error.message})
    }


})

router.post('/signin',async (req,res)=>{

  const { email, password } = req.body
  if(!email || !password){
    return res.status(400).json({error : "Enter all the credentails correctly"})
  }

  if(!isEmail(email)){
    return res.status(400).json({error : "Enter a valid Email"})
  }
  
  try {
      const user = await Patient.findOne({email})
      if(!user){
          return res.status(400).json({error : "No such user exists"})
      }

      const correctPassword = await user.isPasswordCorrect(password)
      if(!correctPassword){
          return res.status(400).json({error : "Invalid Password"})
      }

      const token = await user.generateAccessToken()
      res.cookie()
      return res.status(200)
                .cookie("medicoo", token, { httpOnly:true, secure:true })
                .json({token, msg:"Successfully Logged IN"})

  } catch (error) {
      return res.status(409).json({error: "Error Logging In"})
  }
})

// Protecting the routes
router.use(requireAuth(Patient))

router.get('/view-prescriptions',async (req,res)=>{

  const prescriptions = await Prescription.find({patient: req.user._id}).populate("doctor", "name contactNumber -_id")

  const normalPrescriptions = prescriptions?.filter((prescription)=>{
    if(prescription.medicationType === 'Normal' && prescription?.status !== 'Inactive'){
      return prescription
    }
  })
  
  const imporatantPrescriptions = prescriptions?.filter((prescription)=>{
    if(prescription.medicationType === 'Important' && prescription?.status !== 'InActive'){
      return prescription
    }
  })

  // These are the prescriptions that are mistakenly added by doctor and need to be deleted by patient if appropriate request
  const mistakenlyAddedPrescriptions = prescriptions?.filter((prescription)=>{
    if(prescription?.status === 'InActive'){
      return prescription
    }
  })

  return res.status(200).json({normalPrescriptions,imporatantPrescriptions, mistakenlyAddedPrescriptions})

})

router.get('/getAll-doctors',async (req,res)=>{
  try {
    const doctors = await Doctor.find({}).select("-prescriptions -password")
    return res.status(200).json(doctors)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

router.get('/getAll-hospitals',async (req,res)=>{
  try {
    const hospitals = await Hospital.find().select("name email contactNumber address")

    return res.status(200).json({hospitals})
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Get the details of the hospital and the doctors working there.
router.get('/hospital-details/:id',async (req,res)=>{
  try {
    const _id = req.params.id
    const hospital = await Hospital.findOne({_id}).select("name email contactNumber address")

    const doctorsAssociatedWithHospital = await Doctor.find({affiliatedHospital: hospital._id}).select("name contactNumber gender dob avatar")

    return res.status(200).json({hospital,doctorsAssociatedWithHospital})
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Will list all appointments.
router.get('/get-appointments',async(req,res)=>{
  try {
    const appointments = await Appointment.find({patient: req.user._id}).populate("doctor", "name contactNumber")
    return res.status(200).json(appointments)

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// In case of Emergency this helps to find the nearest hospitals around you.
router.post('/getnearby',async (req,res)=>{
    const {userLongitude, userLatitude} = req.body

    try {
      const hospitals = await Hospital.aggregate([
        {
            $geoNear: {
                near: {
                    type: 'Point',
                    coordinates: [userLongitude, userLatitude],
                },
                distanceField: 'distance',
                spherical: true,
                maxDistance: 100000,
            },
        },
        {
            $project: {
                name: 1,
                address: 1,
                distance: 1,
                contactNumber: 1,
                _id: 0,
            },
        },
    ]).sort({ distance: 1 }).limit(3);

      return res.json({hospitals});

  } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
})

// Stripe Payment Integration
router.post("/create-checkout-session", async (req, res) => {

  const { doctorId } = req.body

  try {

    const doctor = await Doctor.findOne({_id: doctorId})

    if(!doctor){
      return res.status(400).json({ error: "No doctor Found. May be you have been navigated somewhere else" })
    }

    const amount = doctor.consultingFees || 500

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [ {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Appointment fees",
            },
            unit_amount: amount * 1000,
          },
          quantity: 1,
        }],
      success_url: `http://localhost:3000/payment/successful`,
      cancel_url: `http://localhost:3000/payment/cancel`,
    })
    return res.status(200).json({ url: session.url })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: e.message })
  }
})

router.post('/book-appointment',async(req,res)=>{

    const {doctorId, reason="Routine Check-Up"} = req.body

    try{
      const doctor = await Doctor.findOne({_id:doctorId})
      if(!doctor){
        return res.status(400).json({ error: "No doctor Found. May be you have been navigated somewhere else" })
      }

      const appointment = await Appointment.create({
        patient: req.user._id,
        doctor: doctorId,
        reason
      })

      if(appointment){
        return res.status(201).json({msg: "Booked appointment SuccessFully"})
      }

      return res.status(500).json({ error: "Could not book appointment" })

    }catch(error){
      return res.status(500).json({ error: error.message })
    }
})

// After the end of the appointment with the doctor the patient can add a rating to corresponding Doctor based on the experirence.
router.post('/appointment-review', async(req,res)=>{

  const { appointmentId, rating } = req.body

  try {
    const appointment = await Appointment.findOneAndDelete({_id: appointmentId})
    if(!appointment){
      return res.status(400).json({ error: "You don't have any appointments." })
    }

    if (appointment.patient.toString() !== req.user._id.toString()) {
      return res.status(400).json({ error: "You don't have any appointments." });
    }

    const doctor = await Doctor.findOne({_id: appointment.doctor })

    if(!doctor){
      return res.status(400).json({ error: "No doctor Found. May be you have been navigated somewhere else" })
    }

    const totalAppointments = doctor.totalAppointments

    doctor.rating = ( doctor.rating * totalAppointments + rating ) / (totalAppointments + 1)
    doctor.totalAppointments = totalAppointments + 1

    await doctor.save()

    return res.status(200).json({msg:"Added rating Successfully"})

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

router.patch('/change-password', async(req,res)=>{
  const { newPassword } = req.body
  const { error, msg } = await UpdatePassword(newPassword, req.user._id, Patient)

  if (error){
    return res.status(400).json({error})
  }

  return res.status(200).json({msg})
  
})

// This is used in case the doctor has mistakenly added a prescription and requested to delete the prescription on patient's confirmation
router.delete('/delete-prescription/:id',async (req,res)=>{
  const id = req.params.id

  try {
    const prescription = await Prescription.findOne({_id: id, patient: req.user._id, status: "InActive" })
    if(prescription){
      return res.status(200).json({msg : "Prescription deleted successfully"})
    }
    return res.status(200).json({msg : "Prescription is not available"})
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }

})

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