const express = require('express')
const router = express.Router()
const patientController = require('../controllers/patientController')
const { authenticate, authorize } = require('../middleware/authMiddleware')

router.use(authenticate)
router.use(authorize('patient'))

router.get('/profile', patientController.getProfile)
router.put('/profile', patientController.updateProfile)
router.get('/dashboard-stats', patientController.getDashboardStats)
router.get('/appointments', patientController.getAppointments)
router.get('/prescriptions', patientController.getPrescriptions)
router.get('/health-records', patientController.getHealthRecords)
router.get('/doctors', patientController.getDoctors)

module.exports = router

