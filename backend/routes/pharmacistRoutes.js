const express = require('express');
const router = express.Router();
const pharmacistController = require('../controllers/pharmacistController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and pharmacist role
router.use(authenticate);
router.use(authorize('pharmacist'));

// Prescription management
router.get('/prescriptions', pharmacistController.getPrescriptions);
router.get('/prescriptions/:id', pharmacistController.getPrescriptionById);
router.post('/prescriptions/:id/collected', pharmacistController.markAsCollected);
router.get('/prescriptions/:id/availability', pharmacistController.checkPrescriptionAvailability);

// Medicine inventory management
router.get('/medicines', pharmacistController.getMedicines);
router.get('/medicines/search', pharmacistController.searchMedicines);
router.get('/medicines/low-stock', pharmacistController.getLowStockMedicines);
router.post('/medicines', pharmacistController.addMedicine);
router.put('/medicines/:id', pharmacistController.updateMedicine);
router.post('/medicines/:id/stock', pharmacistController.updateMedicineStock);
router.delete('/medicines/:id', pharmacistController.deleteMedicine);

module.exports = router;
