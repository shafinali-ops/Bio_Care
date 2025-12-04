const Vital = require('../models/vital');
const Patient = require('../models/patient');

// @desc    Create new vital record
// @route   POST /api/vitals
// @access  Private (Patient)
exports.createVital = async (req, res) => {
    try {
        const { heartRate, bloodPressure, temperature, oxygenSaturation, weight, height, notes } = req.body;

        // Get patient ID from user
        const patient = await Patient.findOne({ userId: req.user._id });
        if (!patient) {
            return res.status(404).json({ message: 'Patient profile not found' });
        }

        // Calculate alert level
        let alertLevel = 'normal';

        // Check for critical values
        if (heartRate && (heartRate < 60 || heartRate > 100)) alertLevel = 'warning';
        if (heartRate && (heartRate < 40 || heartRate > 120)) alertLevel = 'critical';

        if (bloodPressure) {
            if (bloodPressure.systolic > 140 || bloodPressure.diastolic > 90) alertLevel = 'warning';
            if (bloodPressure.systolic > 180 || bloodPressure.diastolic > 120) alertLevel = 'critical';
        }

        if (temperature && (temperature > 38 || temperature < 35)) alertLevel = 'warning';
        if (temperature && (temperature > 39.5 || temperature < 34)) alertLevel = 'critical';

        if (oxygenSaturation && oxygenSaturation < 95) alertLevel = 'warning';
        if (oxygenSaturation && oxygenSaturation < 90) alertLevel = 'critical';

        const vital = await Vital.create({
            patientId: patient._id,
            heartRate,
            bloodPressure,
            temperature,
            oxygenSaturation,
            weight,
            height,
            notes,
            alertLevel
        });

        res.status(201).json(vital);
    } catch (error) {
        console.error('Error creating vital:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get all vitals for logged-in patient
// @route   GET /api/vitals
// @access  Private (Patient)
exports.getMyVitals = async (req, res) => {
    try {
        const patient = await Patient.findOne({ userId: req.user._id });
        if (!patient) {
            return res.status(404).json({ message: 'Patient profile not found' });
        }

        const vitals = await Vital.find({ patientId: patient._id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(vitals);
    } catch (error) {
        console.error('Error fetching vitals:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get vitals for specific patient (Doctor/Admin)
// @route   GET /api/vitals/patient/:patientId
// @access  Private (Doctor/Admin)
exports.getPatientVitals = async (req, res) => {
    try {
        const vitals = await Vital.find({ patientId: req.params.patientId })
            .sort({ createdAt: -1 })
            .populate('patientId', 'name age gender')
            .limit(50);

        res.json(vitals);
    } catch (error) {
        console.error('Error fetching patient vitals:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get single vital record
// @route   GET /api/vitals/:id
// @access  Private
exports.getVital = async (req, res) => {
    try {
        const vital = await Vital.findById(req.params.id)
            .populate('patientId', 'name age gender');

        if (!vital) {
            return res.status(404).json({ message: 'Vital record not found' });
        }

        res.json(vital);
    } catch (error) {
        console.error('Error fetching vital:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update vital record
// @route   PUT /api/vitals/:id
// @access  Private (Patient)
exports.updateVital = async (req, res) => {
    try {
        const { heartRate, bloodPressure, temperature, oxygenSaturation, weight, height, notes } = req.body;

        let vital = await Vital.findById(req.params.id);
        if (!vital) {
            return res.status(404).json({ message: 'Vital record not found' });
        }

        // Check ownership
        const patient = await Patient.findOne({ userId: req.user._id });
        if (vital.patientId.toString() !== patient._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this record' });
        }

        // Calculate alert level
        let alertLevel = 'normal';
        const hr = heartRate || vital.heartRate;
        const bp = bloodPressure || vital.bloodPressure;
        const temp = temperature || vital.temperature;
        const spo2 = oxygenSaturation || vital.oxygenSaturation;

        if (hr && (hr < 60 || hr > 100)) alertLevel = 'warning';
        if (hr && (hr < 40 || hr > 120)) alertLevel = 'critical';

        if (bp) {
            if (bp.systolic > 140 || bp.diastolic > 90) alertLevel = 'warning';
            if (bp.systolic > 180 || bp.diastolic > 120) alertLevel = 'critical';
        }

        if (temp && (temp > 38 || temp < 35)) alertLevel = 'warning';
        if (temp && (temp > 39.5 || temp < 34)) alertLevel = 'critical';

        if (spo2 && spo2 < 95) alertLevel = 'warning';
        if (spo2 && spo2 < 90) alertLevel = 'critical';

        vital = await Vital.findByIdAndUpdate(
            req.params.id,
            {
                heartRate,
                bloodPressure,
                temperature,
                oxygenSaturation,
                weight,
                height,
                notes,
                alertLevel
            },
            { new: true, runValidators: true }
        );

        res.json(vital);
    } catch (error) {
        console.error('Error updating vital:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete vital record
// @route   DELETE /api/vitals/:id
// @access  Private (Patient)
exports.deleteVital = async (req, res) => {
    try {
        const vital = await Vital.findById(req.params.id);
        if (!vital) {
            return res.status(404).json({ message: 'Vital record not found' });
        }

        // Check ownership
        const patient = await Patient.findOne({ userId: req.user._id });
        if (vital.patientId.toString() !== patient._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this record' });
        }

        await vital.deleteOne();
        res.json({ message: 'Vital record deleted' });
    } catch (error) {
        console.error('Error deleting vital:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get latest vital for patient
// @route   GET /api/vitals/latest/:patientId
// @access  Private (Doctor/Admin)
exports.getLatestVital = async (req, res) => {
    try {
        const vital = await Vital.findOne({ patientId: req.params.patientId })
            .sort({ createdAt: -1 })
            .populate('patientId', 'name age gender');

        if (!vital) {
            return res.status(404).json({ message: 'No vital records found' });
        }

        res.json(vital);
    } catch (error) {
        console.error('Error fetching latest vital:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
