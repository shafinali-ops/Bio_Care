const express = require('express')
const router = express.Router()
const hospitalController = require('../controllers/hospitalController')
const doctorController = require('../controllers/doctorController')
const { authenticate, authorize } = require('../middleware/authMiddleware')

router.get('/nearby', hospitalController.getNearbyHospitals)
router.post('/suggest', authenticate, authorize('doctor'), doctorController.suggestHospital)
router.get('/', hospitalController.getAllHospitals)
router.post('/', authenticate, hospitalController.createHospital)

module.exports = router

