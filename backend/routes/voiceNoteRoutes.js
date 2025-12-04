const express = require('express')
const router = express.Router()
const voiceNoteController = require('../controllers/voiceNoteController')
const { authenticate, authorize } = require('../middleware/authMiddleware')

router.use(authenticate)

router.post('/', authorize('doctor'), voiceNoteController.uploadVoiceNote)
router.get('/patient/:patientId', authorize(['doctor', 'patient']), voiceNoteController.getPatientVoiceNotes)
router.get('/patient', authorize('patient'), voiceNoteController.getMyVoiceNotes)
router.get('/doctor', authorize('doctor'), voiceNoteController.getDoctorVoiceNotes)

module.exports = router

