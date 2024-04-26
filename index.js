require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose');
const cors = require('cors')
const cookieParser = require('cookie-parser')
const path = require("path")
const numCPUs = require('node:os').availableParallelism();
const cluster = require('node:cluster');

// Routes
const patientHandler = require('./routes/patient.js')
const hospitalHandler = require('./routes/hospital.js')
const doctorHandler = require('./routes/doctor.js')

PORT = 8000
const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(cookieParser())
app.use(express.static(path.resolve("./public")));

mongoose
    .connect(process.env.MONGO_URL)
    .then((e)=>{
        console.log("Connected to mongoDb Successfully");
        app.listen(PORT, ()=>{
            console.log("Server started at Port " + PORT)
        })
        
    })
    .catch((error)=>{
        console.log(`There was an error in connecting to mongoDb ${error.message}`)
    })


app.use('/api/v1/patient',patientHandler)
app.use('/api/v1/doctor',doctorHandler)
app.use('/api/v1/hospital',hospitalHandler)


app.use((req,res)=>{
  return res.status(404).json({message:"You have been Navigated Somewhere Else"})
})

