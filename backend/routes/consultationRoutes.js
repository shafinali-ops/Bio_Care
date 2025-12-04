const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// IMPORTANT: More specific routes MUST come before generic /:id routes

// Create consultation (doctors only)
router.post('/create',
    authorize('doctor'),
    consultationController.createConsultation
);

// Get consultations by patient ID (more specific route - comes BEFORE /:id)
router.get('/byPatient/:patient_id',
    consultationController.getConsultationsByPatient
);

// Get consultations by doctor (for doctor dashboard)
router.get('/doctor',
    authorize('doctor'),
    consultationController.getConsultationsByDoctor
);

// Start consultation (doctors only)
router.put('/:id/start',
    authorize('doctor'),
    consultationController.startConsultation
);

// Update consultation (doctors only)
router.put('/:id/update',
    authorize('doctor'),
    consultationController.updateConsultation
);

// Complete consultation (doctors only)
router.put('/:id/complete',
    authorize('doctor'),
    consultationController.completeConsultation
);

// Get consultation by ID (generic route - comes LAST)
router.get('/:id',
    consultationController.getConsultationById
);

module.exports = router;
