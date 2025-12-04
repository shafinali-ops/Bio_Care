const express = require('express')
const router = express.Router()
const doctorController = require('../controllers/doctorController')
const { authenticate, authorize } = require('../middleware/authMiddleware')

router.use(authenticate)

// Available to all authenticated users
router.get('/available', doctorController.getAvailableDoctors)
router.get('/available-slots', doctorController.getAvailableSlots) // Get available time slots
router.get('/', doctorController.getAllDoctors)

// Doctor only routes
router.use(authorize('doctor'))

router.get('/profile', doctorController.getProfile)
router.get('/dashboard-stats', doctorController.getDashboardStats)
router.put('/availability', doctorController.updateAvailability) // For schedule slots
router.put('/status', doctorController.toggleAvailability) // For real-time status
router.get('/patients', doctorController.getPatients)
router.get('/consultations', doctorController.getConsultations)
router.get('/appointments', doctorController.getAppointments)
router.get('/medical-history/:patientId', doctorController.viewMedicalHistory)
router.post('/suggest-hospital', doctorController.suggestHospital)
router.get('/high-risk-patients', doctorController.getHighRiskPatients)

module.exports = router

