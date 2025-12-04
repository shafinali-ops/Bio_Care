const express = require('express')
const router = express.Router()
const pharmacyController = require('../controllers/pharmacyController')
const { authenticate, authorize } = require('../middleware/authMiddleware')

// Public routes (for patients)
router.get('/', pharmacyController.getAllMedications)
router.get('/categories', pharmacyController.getCategories)
router.get('/:id', pharmacyController.getMedicationById)

// Admin routes
router.post('/', authenticate, authorize('admin'), pharmacyController.createMedication)
router.put('/:id', authenticate, authorize('admin'), pharmacyController.updateMedication)
router.delete('/:id', authenticate, authorize('admin'), pharmacyController.deleteMedication)

module.exports = router







