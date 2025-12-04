const express = require('express');
const router = express.Router();
const {
    createVital,
    getMyVitals,
    getPatientVitals,
    getVital,
    updateVital,
    deleteVital,
    getLatestVital
} = require('../controllers/vitalController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Patient routes
router.post('/', authenticate, authorize('patient'), createVital);
router.get('/', authenticate, authorize('patient'), getMyVitals);
router.get('/:id', authenticate, getVital);
router.put('/:id', authenticate, authorize('patient'), updateVital);
router.delete('/:id', authenticate, authorize('patient'), deleteVital);

// Doctor/Admin routes
router.get('/patient/:patientId', authenticate, authorize('doctor', 'admin'), getPatientVitals);
router.get('/latest/:patientId', authenticate, authorize('doctor', 'admin'), getLatestVital);

module.exports = router;
