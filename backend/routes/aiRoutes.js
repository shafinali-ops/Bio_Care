const express = require('express')
const router = express.Router()
const aiController = require('../controllers/aiController')
const { authenticate } = require('../middleware/authMiddleware')

router.use(authenticate)

router.post('/symptom-checker', aiController.analyzeSymptoms)
router.post('/urgency-assessment', aiController.getUrgencyAssessment)
router.get('/symptom-history', aiController.getSymptomHistory)
router.get('/symptom-history/:id', aiController.getSymptomCheckById)


module.exports = router

