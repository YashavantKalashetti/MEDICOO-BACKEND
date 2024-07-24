const Hospital = require('../models/hospital.js')
const Doctor = require('../models/doctor.js')
const { isEmail } =require('validator')

const addHospital = async (req,res)=>{
    const { name, contactNumber, email, address, latitude, longitude,password } = req.body

    try {
        const data = await Hospital.create({
            name,
            contactNumber,
            email,
            address,
            password,
            location:{
                coordinates:[longitude, latitude]
            }
        })

        if(!data){
            return res.status(400).json({error:"Hospital not added"})
        }

        return res.status(201).json({data})

    } catch (error) {
        return res.json({error:error.message})
    }

}

const signin = async(req,res)=>{

    const {email,password} = req.body

    try {

        if(!email || !password){
            return res.status(400).json({error : "Enter all the credentails correctly"})
          }
        
          if(!isEmail(email)){
            return res.status(400).json({error : "Enter a valid Email"})
          }


        const account = await Hospital.findOne({email})

        if(!account){
            return res.status(400).json({error : "No account exists with this email."})
        }

        const correctPassword = await account.isPasswordCorrect(password)

        if(!correctPassword){
            return res.status(400).json({error : "Incorrect Password"})
        }

        const token = await account.generateAccessToken()
        return res.status(200)
                .cookie("medicoo", token, { httpOnly:true, secure:true })
                .json({token, msg:"Successfully Logged IN"})
        
    } catch (error) {
        return res.status(400).json({error:error.message})
    }
}

const getDoctors = async (req,res)=>{
    try {
        const doctors = await Doctor.find({ affiliatedHospital: req.user._id }).select("name contactNumber email -_id")
        
        return res.status(200).json(doctors)

    } catch (error) {
        return res.status(400).json({error:error.message})
    }
}

const changePassword = async(req,res)=>{
    const { newPassword } = req.body
    const { error, msg } = await UpdatePassword(newPassword, req.user._id, Hospital)

    if (error){
        return res.status(400).json({error})
    }

    return res.status(200).json({msg}) 
}

module.exports = {
    addHospital,
    signin,
    getDoctors,
    changePassword
}