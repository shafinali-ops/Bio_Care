const Consultation = require('../models/consultation');
const Appointment = require('../models/appointment');
const Prescription = require('../models/prescription');
const Doctor = require('../models/doctor');

// Create a new consultation
exports.createConsultation = async (req, res) => {
    try {
        console.log('🚀 createConsultation called');
        console.log('Request body:', req.body);
        console.log('User:', req.user ? req.user._id : 'No user');

        const { appointmentId, symptoms, doctor_notes, diagnosis, recommended_tests } = req.body;

        // Validate required fields
        if (!appointmentId || !symptoms || !diagnosis) {
            return res.status(400).json({
                message: 'appointmentId, symptoms, and diagnosis are required'
            });
        }

        // Find the appointment
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        console.log('✅ Appointment found:', appointment._id);

        // Check if appointment is approved or accepted
        if (appointment.status !== 'approved' && appointment.status !== 'accepted') {
            return res.status(400).json({
                message: 'Consultation can only be created for approved or accepted appointments'
            });
        }

        // Check if consultation already exists for this appointment
        const existingConsultation = await Consultation.findOne({ appointmentId });
        if (existingConsultation) {
            return res.status(400).json({
                message: 'Consultation already exists for this appointment'
            });
        }

        // Verify patient and doctor IDs match
        const patientId = appointment.patientId;
        const doctorId = appointment.doctorId;

        // Ensure doctor making the consultation is the one from the appointment
        if (req.user.role === 'doctor') {
            const doctorProfile = await Doctor.findOne({ userId: req.user._id });

            if (!doctorProfile) {
                console.error('❌ Doctor profile not found for user:', req.user._id);
                return res.status(404).json({ message: 'Doctor profile not found' });
            }
            console.log('✅ Doctor profile found:', doctorProfile._id);

            if (doctorProfile._id.toString() !== doctorId.toString()) {
                console.error('❌ Doctor ID mismatch:', doctorProfile._id, '!==', doctorId);
                return res.status(403).json({
                    message: 'You can only create consultations for your own appointments'
                });
            }
        }

        // Check if doctor already has an active consultation
        console.log('Checking if doctor has active consultation...');
        const activeConsultation = await Consultation.findOne({
            doctorId,
            consultation_status: 'ACTIVE'
        });

        if (activeConsultation) {
            console.log('❌ Doctor is currently in another consultation');
            return res.status(409).json({
                message: 'Doctor is currently consulting another patient. Please complete the active consultation first.'
            });
        }

        // Validate consultation date >= appointment date
        const consultationDate = new Date();
        console.log('Dates:', { consultation: consultationDate, appointment: appointment.date });

        // Strict date check removed to allow starting early for testing
        /*
        if (consultationDate < new Date(appointment.date)) {
            return res.status(400).json({
                message: 'Consultation date cannot be before appointment date'
            });
        }
        */

        // Create the consultation
        console.log('📝 Creating consultation document...');
        const consultation = new Consultation({
            appointmentId,
            patientId,
            doctorId,
            symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
            doctor_notes,
            diagnosis,
            recommended_tests: recommended_tests || [],
            consultation_date: consultationDate,
            consultation_status: 'PENDING', // Set initial status (Enum: PENDING, READY, ACTIVE, ENDED, CANCELLED)
            status: 'scheduled' // Legacy field (Enum: scheduled, in-progress, completed, cancelled)
        });

        await consultation.save();
        console.log('✅ Consultation saved:', consultation._id);

        await consultation.populate([
            { path: 'patientId', select: 'name email' },
            { path: 'doctorId', select: 'name specialization' },
            { path: 'appointmentId' }
        ]);

        res.status(201).json({
            message: 'Consultation created successfully',
            consultation
        });

    } catch (error) {
        console.error('❌ Error creating consultation:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            message: 'Error creating consultation',
            error: error.message
        });
    }
};

// Get consultation by ID
exports.getConsultationById = async (req, res) => {
    try {
        const { id } = req.params;

        const consultation = await Consultation.findById(id)
            .populate('patientId', 'name email age gender')
            .populate('doctorId', 'name specialization')
            .populate('appointmentId');

        if (!consultation) {
            return res.status(404).json({ message: 'Consultation not found' });
        }

        // Authorization check
        if (req.user.role === 'patient' && consultation.patientId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        if (req.user.role === 'doctor') {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor || consultation.doctorId._id.toString() !== doctor._id.toString()) {
                return res.status(403).json({ message: 'Unauthorized access' });
            }
        }

        res.json(consultation);

    } catch (error) {
        console.error('Error fetching consultation:', error);
        res.status(500).json({
            message: 'Error fetching consultation',
            error: error.message
        });
    }
};

// Get consultations by patient ID
exports.getConsultationsByPatient = async (req, res) => {
    try {
        const { patient_id } = req.params;

        // Authorization check
        if (req.user.role === 'patient' && req.user.id !== patient_id) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        const consultations = await Consultation.find({ patientId: patient_id })
            .sort({ consultation_date: -1 })
            .populate('doctorId', 'name specialization')
            .populate('appointmentId', 'date reason');

        res.json(consultations);

    } catch (error) {
        console.error('Error fetching consultations:', error);
        res.status(500).json({
            message: 'Error fetching consultations',
            error: error.message
        });
    }
};

// Update consultation
exports.updateConsultation = async (req, res) => {
    try {
        const { id } = req.params;
        const { symptoms, doctor_notes, diagnosis, recommended_tests } = req.body;

        const consultation = await Consultation.findById(id);
        if (!consultation) {
            return res.status(404).json({ message: 'Consultation not found' });
        }

        // Only the doctor who created the consultation can update it
        if (req.user.role === 'doctor') {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor || consultation.doctorId.toString() !== doctor._id.toString()) {
                return res.status(403).json({
                    message: 'You can only update your own consultations'
                });
            }
        }

        // Update fields
        if (symptoms) consultation.symptoms = Array.isArray(symptoms) ? symptoms : [symptoms];
        if (doctor_notes) consultation.doctor_notes = doctor_notes;
        if (diagnosis) consultation.diagnosis = diagnosis;
        if (recommended_tests) consultation.recommended_tests = recommended_tests;

        await consultation.save();

        await consultation.populate([
            { path: 'patientId', select: 'name email' },
            { path: 'doctorId', select: 'name specialization' },
            { path: 'appointmentId' }
        ]);

        res.json({
            message: 'Consultation updated successfully',
            consultation
        });

    } catch (error) {
        console.error('Error updating consultation:', error);
        res.status(500).json({
            message: 'Error updating consultation',
            error: error.message
        });
    }
};

// Get consultations by doctor (for doctor dashboard)
exports.getConsultationsByDoctor = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user._id });
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found' });
        }
        const doctorId = doctor._id;

        const consultations = await Consultation.find({ doctorId })
            .sort({ consultation_date: -1 })
            .populate('patientId', 'name email age gender')
            .populate('appointmentId', 'date reason');

        res.json(consultations);

    } catch (error) {
        console.error('Error fetching consultations:', error);
        res.status(500).json({
            message: 'Error fetching consultations',
            error: error.message
        });
    }
};

// Start a consultation
exports.startConsultation = async (req, res) => {
    try {
        const { id } = req.params;

        const consultation = await Consultation.findById(id);
        if (!consultation) {
            return res.status(404).json({ message: 'Consultation not found' });
        }

        // Only the assigned doctor can start the consultation
        if (req.user.role === 'doctor') {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor || consultation.doctorId.toString() !== doctor._id.toString()) {
                return res.status(403).json({ message: 'You can only start your own consultations' });
            }
        }

        // Check if already started or completed
        if (consultation.consultation_status === 'ACTIVE') {
            return res.status(400).json({ message: 'Consultation is already in progress' });
        }
        if (consultation.consultation_status === 'ENDED') {
            return res.status(400).json({ message: 'Consultation is already completed' });
        }

        consultation.consultation_status = 'ACTIVE';
        consultation.status = 'in-progress';
        consultation.started_at = new Date();
        await consultation.save();

        await consultation.populate([
            { path: 'patientId', select: 'name email age gender' },
            { path: 'doctorId', select: 'name specialization' },
            { path: 'appointmentId' }
        ]);

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${consultation.patientId._id}`).emit('consultation_started', {
                consultationId: consultation._id,
                doctorName: consultation.doctorId.name,
                message: 'Your consultation has started'
            });
        }

        res.json({
            message: 'Consultation started successfully',
            consultation
        });

    } catch (error) {
        console.error('Error starting consultation:', error);
        res.status(500).json({
            message: 'Error starting consultation',
            error: error.message
        });
    }
};

// Update consultation (during consultation)
exports.updateConsultation = async (req, res) => {
    try {
        const { id } = req.params;
        const { symptoms, doctor_notes, diagnosis, recommended_tests } = req.body;

        const consultation = await Consultation.findById(id);
        if (!consultation) {
            return res.status(404).json({ message: 'Consultation not found' });
        }

        // Only the assigned doctor can update
        if (req.user.role === 'doctor') {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor || consultation.doctorId.toString() !== doctor._id.toString()) {
                return res.status(403).json({ message: 'You can only update your own consultations' });
            }
        }

        // Update fields if provided
        if (symptoms) consultation.symptoms = Array.isArray(symptoms) ? symptoms : [symptoms];
        if (doctor_notes !== undefined) consultation.doctor_notes = doctor_notes;
        if (diagnosis) consultation.diagnosis = diagnosis;
        if (recommended_tests) consultation.recommended_tests = recommended_tests;

        await consultation.save();

        await consultation.populate([
            { path: 'patientId', select: 'name email age gender' },
            { path: 'doctorId', select: 'name specialization' },
            { path: 'appointmentId' }
        ]);

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.to(`consultation:${consultation._id}`).emit('consultation_updated', {
                consultationId: consultation._id,
                updates: { symptoms, doctor_notes, diagnosis, recommended_tests }
            });
        }

        res.json({
            message: 'Consultation updated successfully',
            consultation
        });

    } catch (error) {
        console.error('Error updating consultation:', error);
        res.status(500).json({
            message: 'Error updating consultation',
            error: error.message
        });
    }
};

// Complete a consultation
exports.completeConsultation = async (req, res) => {
    try {
        const { id } = req.params;

        const consultation = await Consultation.findById(id);
        if (!consultation) {
            return res.status(404).json({ message: 'Consultation not found' });
        }

        // Only the assigned doctor can complete
        if (req.user.role === 'doctor') {
            const doctor = await Doctor.findOne({ userId: req.user._id });
            if (!doctor || consultation.doctorId.toString() !== doctor._id.toString()) {
                return res.status(403).json({ message: 'You can only complete your own consultations' });
            }
        }

        // Check if already completed
        if (consultation.consultation_status === 'ENDED') {
            return res.status(400).json({ message: 'Consultation is already completed' });
        }

        // Validate required fields before completing
        if (!consultation.diagnosis || !consultation.symptoms || consultation.symptoms.length === 0) {
            return res.status(400).json({
                message: 'Cannot complete consultation without diagnosis and symptoms'
            });
        }

        consultation.consultation_status = 'ENDED';
        consultation.completed_at = new Date();
        consultation.status = 'completed'; // Update legacy field too
        await consultation.save();

        // Update appointment status to completed
        await Appointment.findByIdAndUpdate(consultation.appointmentId, { status: 'completed' });

        await consultation.populate([
            { path: 'patientId', select: 'name email age gender' },
            { path: 'doctorId', select: 'name specialization' },
            { path: 'appointmentId' }
        ]);

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${consultation.patientId._id}`).emit('consultation_completed', {
                consultationId: consultation._id,
                doctorName: consultation.doctorId.name,
                message: 'Your consultation has been completed'
            });
        }

        res.json({
            message: 'Consultation completed successfully',
            consultation
        });

    } catch (error) {
        console.error('Error completing consultation:', error);
        res.status(500).json({
            message: 'Error completing consultation',
            error: error.message
        });
    }
};
