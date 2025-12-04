const express = require('express')
const router = express.Router()
const appointmentController = require('../controllers/appointmentController')
const patientController = require('../controllers/patientController')
const doctorController = require('../controllers/doctorController')
const { authenticate, authorize } = require('../middleware/authMiddleware')

router.use(authenticate)

router.post('/', appointmentController.createAppointment)
router.get('/', appointmentController.getAppointments)
router.get('/patient', authorize('patient'), patientController.getAppointments)
router.get('/doctor', authorize('doctor'), doctorController.getAppointments)
router.get('/:id', appointmentController.getAppointmentById)
router.put('/:id', appointmentController.updateAppointment)
router.put('/:id/accept', authorize('doctor'), appointmentController.acceptAppointment)
router.put('/:id/reject', authorize('doctor'), appointmentController.rejectAppointment)
router.put('/:id/complete', authorize('doctor'), appointmentController.completeAppointment)
router.put('/:id/reschedule', appointmentController.rescheduleAppointment)
router.delete('/:id', appointmentController.cancelAppointment)

module.exports = router

