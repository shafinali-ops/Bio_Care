const Patient = require('../models/patient');
const User = require('../models/user');
const Consultation = require('../models/consultation');
const Doctor = require('../models/doctor');
const Appointment = require('../models/appointment');
const bcrypt = require('bcryptjs');

// Register a new patient
exports.registerPatient = async (req, res) => {
    try {
        const { name, age, gender, email, password } = req.body;
        const lhwId = req.user._id;

        // Validate required fields
        if (!name || !age || !gender || !email || !password) {
            return res.status(400).json({
                message: 'All fields are required: name, age, gender, email, password'
            });
        }

        // Check if user with this email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: 'User with this email already exists'
            });
        }

        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User account for the patient
        const user = new User({
            email,
            password: hashedPassword,
            role: 'patient',
            name
        });
        await user.save();

        // Create Patient record
        const patient = new Patient({
            userId: user._id,
            name,
            age: parseInt(age),
            gender
        });
        await patient.save();

        res.status(201).json({
            message: 'Patient registered successfully',
            patient: {
                _id: patient._id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                email: email,
                registeredBy: lhwId
            }
        });
    } catch (error) {
        console.error('Error registering patient:', error);
        res.status(500).json({
            message: 'Error registering patient',
            error: error.message
        });
    }
};

// Get all patients registered by this LHW
exports.getMyPatients = async (req, res) => {
    try {
        const lhwId = req.user._id;

        // Get all patients (we'll track LHW registration separately if needed)
        const patients = await Patient.find()
            .populate('userId', 'email name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: patients.length,
            patients
        });
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({
            message: 'Error fetching patients',
            error: error.message
        });
    }
};

// Get a specific patient by ID
exports.getPatientById = async (req, res) => {
    try {
        const { id } = req.params;

        const patient = await Patient.findById(id)
            .populate('userId', 'email name');

        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        res.status(200).json({ patient });
    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({
            message: 'Error fetching patient',
            error: error.message
        });
    }
};

// Note: Symptom tracking removed - use standard consultation flow instead

// Start consultation - create appointment and consultation
// Start consultation - create appointment and consultation
exports.startConsultation = async (req, res) => {
    try {
        const { patientId, doctorId, symptoms } = req.body;

        // Validate inputs
        if (!patientId || !doctorId) {
            return res.status(400).json({
                message: 'Patient ID and Doctor ID are required'
            });
        }

        // Find patient
        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Find doctor
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Calculate start and end times
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 minutes duration

        // Create appointment
        const appointment = new Appointment({
            patientId: patient._id,
            doctorId: doctorId,
            date: startTime,
            time: startTime.toLocaleTimeString('en-US', { hour12: false }),
            startTime: startTime,
            endTime: endTime,
            reason_for_visit: `LHW-initiated consultation for ${patient.name}`,
            status: 'approved', // Auto-approve LHW consultations
            type: 'video',
            notes: `LHW-initiated consultation for ${patient.name}`
        });

        await appointment.save();

        // Create consultation
        const consultation = new Consultation({
            appointmentId: appointment._id,
            patientId: patient._id,
            doctorId: doctorId,
            symptoms: symptoms || [],
            diagnosis: 'Pending',
            consultation_status: 'READY'
        });

        await consultation.save();

        // Populate the response
        await consultation.populate('doctorId patientId');
        await appointment.populate('doctorId patientId');

        res.status(201).json({
            message: 'Consultation started successfully',
            consultation,
            appointment
        });
    } catch (error) {
        console.error('Error starting consultation:', error);
        res.status(500).json({
            message: 'Error starting consultation',
            error: error.message
        });
    }
};

// Search patients by name
exports.searchPatients = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const patients = await Patient.find({
            name: { $regex: query, $options: 'i' }
        })
            .populate('userId', 'email name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: patients.length,
            patients
        });
    } catch (error) {
        console.error('Error searching patients:', error);
        res.status(500).json({
            message: 'Error searching patients',
            error: error.message
        });
    }
};

// Get patient's consultation history
exports.getPatientConsultations = async (req, res) => {
    try {
        const { id } = req.params;

        const patient = await Patient.findById(id)
            .populate('userId', 'email name');

        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Query consultations separately
        const consultations = await Consultation.find({ patientId: id })
            .populate('doctorId', 'name specialization')
            .sort({ createdAt: -1 });

        res.status(200).json({
            patient: {
                name: patient.name,
                age: patient.age,
                gender: patient.gender
            },
            consultations
        });
    } catch (error) {
        console.error('Error fetching consultations:', error);
        res.status(500).json({
            message: 'Error fetching consultations',
            error: error.message
        });
    }
};
