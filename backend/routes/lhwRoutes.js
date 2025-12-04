const express = require('express');
const router = express.Router();
const lhwController = require('../controllers/lhwController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and LHW role
router.use(authenticate);
router.use(authorize('lhw'));

// Patient management
router.post('/register-patient', lhwController.registerPatient);
router.get('/patients', lhwController.getMyPatients);
router.get('/patients/search', lhwController.searchPatients);
router.get('/patients/:id', lhwController.getPatientById);

// Consultation management
router.post('/start-consultation', lhwController.startConsultation);
router.get('/patients/:id/consultations', lhwController.getPatientConsultations);

module.exports = router;

