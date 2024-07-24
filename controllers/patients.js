
const { isEmail } = require('validator')

const Patient = require('../models/patient.js')
const UpdatePassword = require('../service/UpdatePassword.js')
const Prescription = require('../models/Prescription.js')
const Doctor = require('../models/doctor.js')
const Appointment = require('../models/appointment.js')
const Hospital = require('../models/hospital.js')

const signup =  async (req,res)=>{

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


}

const signin = async (req,res)=>{

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
}

const getNearBy = async (req,res)=>{
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
}

const viewPrescriptions = async (req,res)=>{

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
  
}

const doctorDetails = async (req,res)=>{
    // Use spec to search doctors by specializations
    const specialization = req?.query?.spec
    try {
      const doctors = await Doctor.find(specialization ? { specialization } : {}).select("-prescriptions -password");
      return res.status(200).json(doctors)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
}

const doctorDetailsById = async (req,res)=>{
    try {
      const doctor = await Doctor.findOne({_id:req.params._id}).select("-prescriptions -password")
      if(!doctor){
        return res.status(403).json({error:"You have been navigated elseware."})
      }
      return res.status(200).json(doctor)
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
}


const hospitalDetails = async (req,res)=>{
    try {
      const hospitals = await Hospital.find().select("name email contactNumber address")
  
      return res.status(200).json({hospitals})
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
}

const hospitalDetailsById = async (req,res)=>{
    try {
      const _id = req.params.id
      const hospital = await Hospital.findOne({_id}).select("name email contactNumber address")
  
      const doctorsAssociatedWithHospital = await Doctor.find({affiliatedHospital: hospital._id}).select("name contactNumber gender dob avatar")
  
      return res.status(200).json({hospital,doctorsAssociatedWithHospital})
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
}

const bookAppointment = async(req,res)=>{

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
}

const paymentCheckout = async (req, res) => {

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
}

const getAppointments = async(req,res)=>{
    try {
      const appointments = await Appointment.find({patient: req.user._id}).populate("doctor", "name contactNumber")
      return res.status(200).json(appointments)
  
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
}

const joinMeeting = async(req,res)=>{
    const userId = req._id
    const appointment = await Appointment.findOne({_id:req.params.id})
    if(!appointment){
        return res.status(403).json({error:"You have been navigated elseware."})
    }
    if(appointment?.patient != userId){
        return res.status(403).json({error:"You are not eligible for this meeting."})
    }
  
    // will be joining the meeting
    return res.status(200).json({msg:"Joining the meeting."})
}

const appointmentReview = async(req,res)=>{

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
  
      return res.status(200).json({msg:"Rating added successfully"})
  
    } catch (error) {
      return res.status(500).json({ error: error.message })
    }
}

const changePassword = async(req,res)=>{
    const { newPassword } = req.body
    const { error, msg } = await UpdatePassword(newPassword, req.user._id, Patient)
  
    if (error){
      return res.status(400).json({error})
    }
  
    return res.status(200).json({msg})
    
}

const deletePrescriptionById = async (req,res)=>{
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
  
}

module.exports = {
    signin,
    signup,
    getNearBy,
    viewPrescriptions,
    doctorDetails,
    doctorDetailsById,
    hospitalDetails,
    hospitalDetailsById,
    bookAppointment,
    paymentCheckout,
    getAppointments,
    joinMeeting,
    appointmentReview,
    changePassword,
    deletePrescriptionById
}