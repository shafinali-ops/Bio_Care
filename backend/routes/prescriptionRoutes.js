const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// IMPORTANT: More specific routes MUST come before generic /:id routes

// Create prescription (doctors only)
router.post('/',
    authorize('doctor'),
    prescriptionController.createPrescription
);

// Get all prescriptions (pharmacist and admin only)
router.get('/',
    authorize('pharmacist', 'admin'),
    prescriptionController.getAllPrescriptions
);

// Get prescriptions for current patient
router.get('/patient',
    authorize('patient'),
    prescriptionController.getPrescriptionsForCurrentPatient
);

// Get prescriptions by patient ID (more specific route - comes BEFORE /:id)
router.get('/patient/:patient_id',
    prescriptionController.getPrescriptionsByPatient
);

// Get prescriptions by doctor (for doctor dashboard)
router.get('/doctor/my-prescriptions',
    authorize('doctor'),
    prescriptionController.getPrescriptionsByDoctor
);

// Get prescription by consultation ID (more specific route)
router.get('/consultation/:consultation_id',
    prescriptionController.getPrescriptionByConsultation
);

// Update prescription (doctors only)
router.put('/:id/update',
    authorize('doctor'),
    prescriptionController.updatePrescription
);

// Download prescription PDF
router.get('/:id/download',
    prescriptionController.downloadPrescriptionPDF
);

// Get prescription by ID (generic route - comes LAST)
router.get('/:id',
    prescriptionController.getPrescriptionById
);

module.exports = router;
