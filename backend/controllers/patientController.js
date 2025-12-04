const Patient = require('../models/patient')
const Appointment = require('../models/appointment')
const Prescription = require('../models/prescription')
const HealthRecord = require('../models/healthRecord')
const MedicalRecord = require('../models/medicalRecord')
const Doctor = require('../models/doctor')
const Consultation = require('../models/consultation')

exports.getProfile = async (req, res) => {
    try {
        const patient = await Patient.findOne({ userId: req.user._id })
            .populate('medicalHistory')
        if (!patient) {
            return res.json(null) // Return null instead of 404 to avoid frontend crash
        }
        res.json(patient)
    } catch (error) {
        console.error('Error in getProfile:', error);
        res.status(500).json({ message: error.message })
    }
}

exports.updateProfile = async (req, res) => {
    try {
        const { name, age, gender } = req.body
        const patient = await Patient.findOneAndUpdate(
            { userId: req.user._id },
            { name, age, gender },
            { new: true, upsert: true } // Create if not exists
        )
        res.json(patient)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getAppointments = async (req, res) => {
    try {
        console.log('getAppointments - User ID:', req.user._id);
        const patient = await Patient.findOne({ userId: req.user._id })
        if (!patient) {
            console.log('getAppointments - No patient profile found');
            return res.json([]) // Return empty array if no patient record
        }
        console.log('getAppointments - Patient ID:', patient._id);
        const appointments = await Appointment.find({ patientId: patient._id })
            .populate('doctorId')
        console.log('getAppointments - Found:', appointments.length);
        res.json(appointments)
    } catch (error) {
        console.error('getAppointments - Error:', error);
        res.status(500).json({ message: error.message })
    }
}

exports.getPrescriptions = async (req, res) => {
    try {
        console.log('getPrescriptions - User ID:', req.user._id);
        const patient = await Patient.findOne({ userId: req.user._id })
        if (!patient) {
            console.log('getPrescriptions - No patient profile found');
            return res.json([]) // Return empty array if no patient record
        }
        console.log('getPrescriptions - Patient ID:', patient._id);
        const prescriptions = await Prescription.find({ patientId: patient._id })
            .populate('doctorId')
            .populate('medication')
        console.log('getPrescriptions - Found:', prescriptions.length);
        res.json(prescriptions)
    } catch (error) {
        console.error('getPrescriptions - Error:', error);
        res.status(500).json({ message: error.message })
    }
}

exports.getHealthRecords = async (req, res) => {
    try {
        const patient = await Patient.findOne({ userId: req.user._id })
        if (!patient) {
            return res.json({ records: [], reports: [] }) // Return empty records
        }
        const healthRecord = await HealthRecord.findOne({ patientId: patient._id })
            .populate('records')
            .populate('reports')
        res.json(healthRecord || { records: [], reports: [] })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find()
            .populate('userId', 'email')
            .populate('hospitalId')
        res.json(doctors)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getDashboardStats = async (req, res) => {
    try {
        console.log('\n=== getDashboardStats DEBUG ===');
        console.log('User ID from token:', req.user._id);
        console.log('User role:', req.user.role);

        const patient = await Patient.findOne({ userId: req.user._id }).populate('userId', 'email');
        console.log('Patient found:', patient ? `Yes (ID: ${patient._id})` : 'No');

        if (!patient) {
            console.log('❌ No patient profile found for user:', req.user._id);
            return res.status(404).json({ message: 'Patient profile not found' });
        }

        console.log('Patient details:', {
            _id: patient._id,
            name: patient.name,
            userId: patient.userId ? patient.userId._id : 'not populated'
        });

        console.log('\nQuerying with patientId:', patient._id);

        const totalAppointments = await Appointment.countDocuments({ patientId: patient._id });
        console.log('Total Appointments found:', totalAppointments);

        const totalConsultations = await Consultation.countDocuments({ patientId: patient._id });
        console.log('Total Consultations found:', totalConsultations);

        const totalPrescriptions = await Prescription.countDocuments({ patientId: patient._id });
        console.log('Total Prescriptions found:', totalPrescriptions);

        // Also check if there are ANY records with different patientId formats
        const allAppointments = await Appointment.countDocuments();
        const allConsultations = await Consultation.countDocuments();
        const allPrescriptions = await Prescription.countDocuments();

        console.log('\nTotal records in collections:');
        console.log('  All Appointments:', allAppointments);
        console.log('  All Consultations:', allConsultations);
        console.log('  All Prescriptions:', allPrescriptions);

        const response = {
            profile: {
                name: patient.name,
                age: patient.age,
                email: patient.userId ? patient.userId.email : '',
                patientId: patient._id
            },
            stats: {
                totalAppointments,
                totalConsultations,
                totalPrescriptions
            }
        };

        console.log('\nResponse:', JSON.stringify(response, null, 2));
        console.log('=== END DEBUG ===\n');

        res.json(response);
    } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        res.status(500).json({ message: error.message });
    }
};
