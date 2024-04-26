require('dotenv').config()
const cloudinary = require('cloudinary').v2;
const fs = require('fs')

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadOnCloudinary = async (filename)=>{
    try {
        if(!filename) return null

        const response = await cloudinary.uploader.upload(filename, {
            resource_type: "auto"
        })

        fs.unlinkSync(filename)
        return response
    } catch (error) {
        fs.unlinkSync(filename)
        return null
    }
}

module.exports = uploadOnCloudinary