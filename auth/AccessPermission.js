const Prescription = require("../models/Prescription")
const Doctor = require("../models/doctor")
const Hospital = require("../models/hospital")
const Patient = require("../models/patient")

const AccessPermission = async(prescriptionId, user,req,res,next)=>{
        const {patient:patientId, doctor:doctorId} = await Prescription.findOne({ _id: prescriptionId }).select("patient doctor")

        // Cheking if the prescription is accessed by patient or Doctor
        if(!(patientId === user._id || doctorId === user._id)){
            return {error: "You are not Authorized"}
        }
        
        return {msg:"Sucessful Access"}
}

module.exports = AccessPermission