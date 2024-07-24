require('dotenv').config()

const Doctor = require('../models/doctor.js')
const Prescription = require('../models/Prescription.js')

const uploadOnCloudinary = require('../service/cloudinaryUpload.js')
const { isEmail } = require('validator')
const UpdatePassword = require('../service/UpdatePassword.js');
const Appointment = require('../models/appointment.js');

const signup = async (req,res)=>{

    try {
        const {name, email, password, contactNumber, gender, address, dob, specialization, affiliatedHospital="Self-Employed"} = req.body
    
        if([name, email, password, contactNumber, gender, address, dob, specialization].some((entry)=> entry?.trim()==='' )){
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
            name, email, password, contactNumber, gender, address, dob, affiliatedHospital, specialization, avatar: globalLink.url
        })
    
        if(!createdUser){
            return res.status(400).json({error: "Account was not created Try again"})
        }
    
        return res.status(201).json( { msg : "Account as been created successfully", user : createdUser.name } )
    } catch (error) {
        const { email, password } = handelError(error)
        return res.status(409).json({error: email ? email : password ? password : error.message})
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

}

const getAppointments = async (req,res)=>{
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
    
}

const joinMeetingByID = async(req,res)=>{
    const userId = req._id
    const appointment = await Appointment.findOne({_id:req.params.id})
    if(!appointment){
        return res.status(403).json({error:"You have been navigated elseware."})
    }
    if(appointment?.doctor != userId){
        return res.status(403).json({error:"You are not eligible for this meeting."})
    }

    // Further write a mail to patient or end notification
    return res.status(200).json({msg:"Joining the meeting."})

}

const viewPrescriptionById = async (req,res)=>{

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
    
}

const addPrecriptions = async(req,res)=>{
    const { patientId, medications, instructionForOtherDoctor, medicationType  } = req.body

    console.log(req.body)

    var localFile = req.file?.path
    var attachment = null

    if(localFile){
        const globalLink = await uploadOnCloudinary(localFile)
        attachment = globalLink?.url
    }

    if(medicationType !== 'Important'){
        instructionForOtherDoctor = ''
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


}

const deletePrescriptions = async (req,res)=>{

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
}

const changeConsultingFees = async(req, res)=>{

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
}

const changePassword = async(req,res)=>{
    const { newPassword } = req.body
    const { error, msg } = await UpdatePassword(newPassword, req.user._id, Doctor)

    if (error){
        return res.status(400).json({error})
    }

    return res.status(200).json({msg})
}

const changeAvatar = async(req,res)=>{
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
}


module.exports = { 
    signin,
    signup,
    getAppointments,
    joinMeetingByID,
    viewPrescriptionById,
    addPrecriptions,
    deletePrescriptions,
    changeConsultingFees,
    changePassword,
    changeAvatar
}