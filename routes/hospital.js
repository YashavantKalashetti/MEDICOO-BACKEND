const express = require('express')
const Hospital = require('../models/hospital.js')
const requireAuth = require('../auth/VerifyToken.js')
const {addHospital, signin, getDoctors, changePassword } = require('../controllers/hospital.js')

const router = express.Router()

router.post('/add-hospital', addHospital)

router.post('/signin', signin)

// Protected Routes
router.use(requireAuth(Hospital))

router.get('/get-doctors', getDoctors)

router.patch('/change-password', changePassword)

module.exports = router