require('dotenv').config()
const express = require('express')

const Doctor = require('../models/doctor.js')
const Prescription = require('../models/Prescription.js')

const upload = require('../service/fileUpload.js')
const uploadOnCloudinary = require('../service/cloudinaryUpload.js')
const { isEmail } = require('validator')
const requireAuth = require('../auth/VerifyToken.js')
const UpdatePassword = require('../service/UpdatePassword.js');
const { route } = require('./patient.js');
const Appointment = require('../models/appointment.js');
const paramMiddleware = require('../auth/customMid.js')

const router = express.Router()


router.post('/signup',upload.single('avatar'),async (req,res)=>{

    try {
        const {name, email, password, contactNumber, gender, address, dob,affiliatedHospital="Self-Employed" } = req.body
    
        if([name, email, password, contactNumber, gender, address, dob].some((entry)=> entry?.trim()==='' )){
          return res.status(400).json({error : "Enter all the credentails correctly"})
        }

        if(!isEmail(email)){
            return res.status(400).json({error : "Enter a valid Email"})
        }
    
        const localFilePath = req.file?.path
        if(!localFilePath){
            return res.status(400).json({error: "Profile picture is required"})
        }
    
        const globalLink = await uploadOnCloudinary(localFilePath)
    
        if(!globalLink){
            return res.status(400).json({error: "Profile picture is required"})
        }
    
        // globalLink.url contains the cloud link file
        const createdUser = await Doctor.create({
            name, email, password, contactNumber, gender, address, dob, affiliatedHospital, avatar: globalLink.url
        })
    
        if(!createdUser){
            return res.status(400).json({error: "Account was not created Try again"})
        }
    
        return res.status(201).json( { msg : "Account as been created successfully", user : createdUser.name } )
    } catch (error) {
        const { email, password } = handelError(error)
        return res.status(409).json({error: email ? email : password ? password : error.message})
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
        const user = await Doctor.findOne({email})
        if(!user){
            return res.status(400).json({error : "No such user exists"})
        }

        const correctPassword = await user.isPasswordCorrect(password)
        if(!correctPassword){
            return res.status(400).json({error : "Invalid Password"})
        }

        const token = await user.generateAccessToken()
        return res.status(200)
                    .cookie("medicoo", token, { httpOnly:true, secure:true })
                    .json({token, msg:"Successfully Logged IN"})

    } catch (error) {
        return res.status(409).json({error: "Error Logging In"})
    }

})


// Protected Routes
router.use(requireAuth(Doctor))

// Get acces To Todays appointments
router.get('/get-appointments',async (req,res)=>{
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    try {
        const appointments = await Appointment.find({
            $and: [
              { doctor: req.user._id },
              { date: { $gte: startOfToday, $lt: endOfToday } }
            ]
        }).populate('patient', "name email contactNumber gender age dob")


        return res.status(200).json({appointments})
    } catch (error) {
        return res.status(500).json({error: error.message})
    }
    
})

router.get('/view-prescriptions/:id',async (req,res)=>{

    const prescriptions = await Prescription.find({patient: req.params.id}).populate('doctor', "name contactNumber email")

    const normalPrescriptions = prescriptions?.filter((prescription)=>{
        if(prescription.medicationType === 'Normal'){
          return prescription
        }
      })
      
      const imporatantPrescriptions = prescriptions?.filter((prescription)=>{
        if(prescription.medicationType === 'Important'){
          return prescription
        }
    })
  
    return res.status(200).json(prescriptions)
    
})

// Post Requests

router.post('/add-prescription',upload.single('reportFile'), async(req,res)=>{
    const { patientId, medications, instructionForOtherDoctor, medicationType  } = req.body

    console.log(req.body)

    var localFile = req.file?.path
    var attachment = null

    if(localFile){
        const globalLink = await uploadOnCloudinary(localFile)
        attachment = globalLink?.url
    }


    try {
        const prescription = await Prescription.create({
            patient: patientId,
            doctor: req.user._id,
            date: Date.now(),
            medications:JSON.parse(medications),
            attachment,
            instructionForOtherDoctor,
            medicationType
        })

        return res.status(201).json({msg:"Successfully added.", prescription})
        
    } catch (error) {
        return res.status(400).json({error: error.message})
    }

    res.status(200).json({ msg:"A request will be sent to the Patient to accept the delete request." })

})

// Delete prescription In case added mistkenly and this should be verified by patient as well to delete the prescription
router.post('/delete-prescription', async (req,res)=>{

    const {prescriptionId} = req.body

    try {

        const prescription = await Prescription.findOneAndUpdate({_id: prescriptionId},{ $set: {status:"InActive"}})
        
        if(!prescription){
            return res.status(400).json({ error:"No such prescription existed" })
        }
        return res.status(200).json({ msg:"A request will be sent to the Patient to accept the delete request." })
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({error:"Server is not responding properly"})
    }
})

router.post('/change-consultingfees',async(req, res)=>{

    const { newFees } = req.body
    try {
        const doctor = await Doctor.findOne({_id: req.user._id})

        if(doctor.consultingFees === newFees){
            return res.status(400).json({error:"ConsultingFees is same as Previous Fees."})
        }

        doctor.consultingFees = newFees

        await doctor.save({validateBeforeSave:false})
        return res.status(200).json({msg:"ConsultingFees has been Updated"})
    } catch (error) {
        return res.status(500).json({error: error.message})
    }
})


// Patch Request

router.patch('/change-password',async(req,res)=>{
    const { newPassword } = req.body
    const { error, msg } = await UpdatePassword(newPassword, req.user._id, Doctor)

    if (error){
        return res.status(400).json({error})
    }

    return res.status(200).json({msg})
})

router.patch('/change-avatar',upload.single('avatar'),async(req,res)=>{
    if(!req.file?.path){
        return res.status(400),json({error:"Cover Page is required"})
    }

    try{

        const doctor = await Doctor.findOne({_id: req.user._id})

        const globalLink = await uploadOnCloudinary(req.file.path)

        if(!globalLink.url){
            return res.status(400).json({error: "Error in updating avatar"})
        }   

        doctor.avatar = globalLink.url
        await doctor.save({validateBeforeSave:false})
        return res.status(200).json({msg:"Avatar has been Updated"})

    }catch(error){
        return res.status(400).json({error: error.message})
    }
})


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
