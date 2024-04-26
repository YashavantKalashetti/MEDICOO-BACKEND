const Doctor = require('../models/doctor')
const Hospital = require('../models/hospital')
const Patient = require('../models/patient')

const UpdatePassword = async function(newPassword, userId, model){
    try {
        if(!newPassword || newPassword.length < 8){
          return { error:"Enter a Valid pasword" }
        }
    
        const user = await model.findOne({ _id: userId })
    
        if(await user.isPasswordCorrect(newPassword)){
          return {error:"Old and new password cannot be same"}
        }
    
        user.password = newPassword
        await user.save({validateBeforeSave: false})
    
        return {msg:"Password have been updated successfully"}
    
      } catch (error) {
        return {error: error.message}
      }
}

module.exports = UpdatePassword