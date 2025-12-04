const Prescription = require('../models/prescription');
const Consultation = require('../models/consultation');

// Create a new prescription
exports.createPrescription = async (req, res) => {
    try {
        console.log('📝 Creating prescription...');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('User:', { id: req.user.id, role: req.user.role });

        const { consultationId, medicines, follow_up_date, instructions } = req.body;

        // Validate required fields
        if (!consultationId) {
            console.log('❌ Missing consultationId');
            return res.status(400).json({
                message: 'consultationId is required'
            });
        }

        if (!medicines || !Array.isArray(medicines)) {
            console.log('❌ Medicines is not an array or is missing');
            return res.status(400).json({
                message: 'medicines must be an array'
            });
        }

        if (medicines.length === 0) {
            console.log('❌ Medicines array is empty');
            return res.status(400).json({
                message: 'At least one medicine is required'
            });
        }

        // Validate each medicine entry
        for (let i = 0; i < medicines.length; i++) {
            const medicine = medicines[i];
            console.log(`Validating medicine ${i}:`, medicine);

            if (!medicine.medicine_name || medicine.medicine_name.trim() === '') {
                console.log(`❌ Medicine ${i} missing medicine_name`);
                return res.status(400).json({
                    message: `Medicine ${i + 1}: medicine_name is required`
                });
            }
            if (!medicine.dosage || medicine.dosage.trim() === '') {
                console.log(`❌ Medicine ${i} missing dosage`);
                return res.status(400).json({
                    message: `Medicine ${i + 1}: dosage is required`
                });
            }
            if (!medicine.frequency || medicine.frequency.trim() === '') {
                console.log(`❌ Medicine ${i} missing frequency`);
                return res.status(400).json({
                    message: `Medicine ${i + 1}: frequency is required`
                });
            }
            if (!medicine.duration || medicine.duration.trim() === '') {
                console.log(`❌ Medicine ${i} missing duration`);
                return res.status(400).json({
                    message: `Medicine ${i + 1}: duration is required`
                });
            }
        }

        // Find the consultation
        console.log('Looking for consultation:', consultationId);
        const consultation = await Consultation.findById(consultationId);

        if (!consultation) {
            console.log('❌ Consultation not found');
            return res.status(404).json({ message: 'Consultation not found' });
        }

        console.log('✅ Consultation found:', {
            id: consultation._id,
            doctorId: consultation.doctorId,
            patientId: consultation.patientId,
            status: consultation.consultation_status
        });

        // Check if consultation exists (allow PENDING, READY, ACTIVE, or ENDED)
        // PENDING = just created, READY = patient can join, ACTIVE = in progress, ENDED = completed
        if (!['PENDING', 'READY', 'ACTIVE', 'ENDED'].includes(consultation.consultation_status)) {
            console.log('❌ Invalid consultation status:', consultation.consultation_status);
            return res.status(400).json({
                message: 'Prescription can only be created for valid consultations (not CANCELLED)'
            });
        }

        // Verify doctor is the one who did the consultation
        if (req.user.role === 'doctor') {
            // Get the doctor's profile to get the Doctor ID
            const Doctor = require('../models/doctor');
            const doctorProfile = await Doctor.findOne({ userId: req.user._id });

            console.log('🔍 Doctor verification:');
            console.log('   User ID:', req.user._id.toString());
            console.log('   User role:', req.user.role);
            console.log('   Doctor Profile ID:', doctorProfile?._id.toString());
            console.log('   Consultation Doctor ID:', consultation.doctorId.toString());

            if (!doctorProfile) {
                console.log('❌ Doctor profile not found');
                return res.status(404).json({ message: 'Doctor profile not found' });
            }

            if (consultation.doctorId.toString() !== doctorProfile._id.toString()) {
                console.log('❌ Doctor mismatch');
                return res.status(403).json({
                    message: 'You can only create prescriptions for your own consultations'
                });
            }

            console.log('✅ Doctor verification passed');
        }

        const patientId = consultation.patientId;
        const doctorId = consultation.doctorId;

        console.log('Checking for existing prescription...');
        // Check if an active prescription already exists for this consultation
        const existingPrescription = await Prescription.findOne({
            consultationId,
            status: 'active'
        });

        if (existingPrescription) {
            console.log('❌ Active prescription already exists');
            return res.status(400).json({
                message: 'An active prescription already exists for this consultation. Please update or cancel the existing prescription first.'
            });
        }

        // Validate prescription date >= consultation date
        const prescriptionDate = new Date();
        if (prescriptionDate < new Date(consultation.consultation_date)) {
            console.log('❌ Prescription date before consultation date');
            return res.status(400).json({
                message: 'Prescription date cannot be before consultation date'
            });
        }

        console.log('Creating prescription document...');
        // Create the prescription
        const prescription = new Prescription({
            consultationId,
            doctorId,
            patientId,
            medicines,
            follow_up_date: follow_up_date ? new Date(follow_up_date) : undefined,
            prescription_date: prescriptionDate,
            instructions,
            status: 'active'
        });

        console.log('Saving prescription...');
        await prescription.save();

        console.log('Populating prescription...');
        await prescription.populate([
            { path: 'patientId', select: 'name email age gender' },
            { path: 'doctorId', select: 'name specialization' },
            { path: 'consultationId' }
        ]);

        // Emit real-time notification to patient
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${prescription.patientId._id}`).emit('prescription_created', {
                prescriptionId: prescription._id,
                consultationId: prescription.consultationId._id,
                doctorName: prescription.doctorId.name,
                medicineCount: prescription.medicines.length,
                message: `Dr. ${prescription.doctorId.name} has created a prescription for you`
            });
        }

        // Notify all pharmacists about the new prescription
        const User = require('../models/user');
        const Notification = require('../models/notification');

        const pharmacists = await User.find({ role: 'pharmacist' });

        for (const pharmacist of pharmacists) {
            // Create notification
            const notification = new Notification({
                userId: pharmacist._id,
                message: `New prescription from Dr. ${prescription.doctorId.name} for ${prescription.patientId.name}`,
                type: 'prescription'
            });
            await notification.save();

            // Emit real-time notification to pharmacist
            if (io) {
                io.to(`user:${pharmacist._id}`).emit('new_prescription', {
                    prescriptionId: prescription._id,
                    patientName: prescription.patientId.name,
                    doctorName: prescription.doctorId.name,
                    medicineCount: prescription.medicines.length,
                    message: `New prescription from Dr. ${prescription.doctorId.name}`
                });
            }
        }

        console.log('✅ Prescription created successfully');
        res.status(201).json({
            message: 'Prescription created successfully',
            prescription
        });

    } catch (error) {
        console.error('❌ Error creating prescription:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            message: 'Error creating prescription',
            error: error.message,
            details: error.toString()
        });
    }
};

// Update prescription
exports.updatePrescription = async (req, res) => {
    try {
        const { id } = req.params;
        const { medicines, follow_up_date, instructions, status } = req.body;

        const prescription = await Prescription.findById(id);
        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        // Only the doctor who created the prescription can update it
        if (req.user.role === 'doctor' && prescription.doctorId.toString() !== req.user.id) {
            return res.status(403).json({
                message: 'You can only update your own prescriptions'
            });
        }

        // Validate medicines if provided
        if (medicines) {
            if (!Array.isArray(medicines) || medicines.length === 0) {
                return res.status(400).json({
                    message: 'Medicines must be an array with at least one entry'
                });
            }

            for (const medicine of medicines) {
                if (!medicine.medicine_name || !medicine.dosage || !medicine.frequency || !medicine.duration) {
                    return res.status(400).json({
                        message: 'Each medicine must have medicine_name, dosage, frequency, and duration'
                    });
                }
            }
            prescription.medicines = medicines;
        }

        // Update other fields
        if (follow_up_date) prescription.follow_up_date = new Date(follow_up_date);
        if (instructions !== undefined) prescription.instructions = instructions;
        if (status && ['active', 'expired', 'cancelled'].includes(status)) {
            prescription.status = status;
        }

        await prescription.save();

        await prescription.populate([
            { path: 'patientId', select: 'name email' },
            { path: 'doctorId', select: 'name specialization' },
            { path: 'consultationId' }
        ]);

        res.json({
            message: 'Prescription updated successfully',
            prescription
        });

    } catch (error) {
        console.error('Error updating prescription:', error);
        res.status(500).json({
            message: 'Error updating prescription',
            error: error.message
        });
    }
};

// Get all prescriptions (for pharmacist/admin)
exports.getAllPrescriptions = async (req, res) => {
    try {
        const prescriptions = await Prescription.find()
            .sort({ prescription_date: -1 })
            .populate('patientId', 'name email age gender')
            .populate('doctorId', 'name specialization')
            .populate('consultationId', 'diagnosis');

        res.json(prescriptions);
    } catch (error) {
        console.error('Error fetching all prescriptions:', error);
        res.status(500).json({
            message: 'Error fetching prescriptions',
            error: error.message
        });
    }
};

// Get prescription by ID
exports.getPrescriptionById = async (req, res) => {
    try {
        const { id } = req.params;

        const prescription = await Prescription.findById(id)
            .populate('patientId', 'name email age gender')
            .populate('doctorId', 'name specialization')
            .populate('consultationId');

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        // Authorization check
        if (req.user.role === 'patient' && prescription.patientId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        if (req.user.role === 'doctor' && prescription.doctorId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        res.json(prescription);

    } catch (error) {
        console.error('Error fetching prescription:', error);
        res.status(500).json({
            message: 'Error fetching prescription',
            error: error.message
        });
    }
};


// Get prescriptions for the currently logged-in patient
exports.getPrescriptionsForCurrentPatient = async (req, res) => {
    try {
        console.log('📋 Fetching prescriptions for current patient:', req.user.id);

        const Patient = require('../models/patient');
        const patient = await Patient.findOne({ userId: req.user._id });

        if (!patient) {
            return res.status(404).json({ message: 'Patient profile not found' });
        }

        const prescriptions = await Prescription.find({ patientId: patient._id })
            .sort({ prescription_date: -1 })
            .populate('doctorId', 'name specialization')
            .populate('consultationId', 'diagnosis symptoms');

        res.json(prescriptions);
    } catch (error) {
        console.error('❌ Error fetching prescriptions:', error);
        res.status(500).json({
            message: 'Error fetching prescriptions',
            error: error.message
        });
    }
};

// Get prescriptions by patient ID
exports.getPrescriptionsByPatient = async (req, res) => {
    try {
        const { patient_id } = req.params;

        console.log('📋 Fetching prescriptions for patient_id:', patient_id);
        console.log('   Request user:', req.user.id, req.user.role);

        // Find the patient profile using the user ID
        const Patient = require('../models/patient');
        const patient = await Patient.findOne({ userId: patient_id });

        if (!patient) {
            console.log('❌ Patient profile not found for user:', patient_id);
            return res.status(404).json({ message: 'Patient profile not found' });
        }

        console.log('✅ Patient profile found:', patient._id);

        // Authorization check - allow if it's the patient themselves
        if (req.user.role === 'patient' && req.user.id !== patient_id) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        // Fetch prescriptions using the Patient profile ID
        const prescriptions = await Prescription.find({ patientId: patient._id })
            .sort({ prescription_date: -1 })
            .populate('doctorId', 'name specialization')
            .populate('consultationId', 'diagnosis symptoms');

        console.log('✅ Found', prescriptions.length, 'prescriptions');

        res.json(prescriptions);

    } catch (error) {
        console.error('❌ Error fetching prescriptions:', error);
        res.status(500).json({
            message: 'Error fetching prescriptions',
            error: error.message
        });
    }
};

// Get prescriptions by doctor (for doctor dashboard)
exports.getPrescriptionsByDoctor = async (req, res) => {
    try {
        const doctorId = req.user.id;

        const prescriptions = await Prescription.find({ doctorId })
            .sort({ prescription_date: -1 })
            .populate('patientId', 'name email age gender')
            .populate('consultationId', 'diagnosis symptoms');

        res.json(prescriptions);

    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        res.status(500).json({
            message: 'Error fetching prescriptions',
            error: error.message
        });
    }
};

// Get prescription by consultation ID
exports.getPrescriptionByConsultation = async (req, res) => {
    try {
        const { consultation_id } = req.params;

        const prescription = await Prescription.findOne({
            consultationId: consultation_id,
            status: 'active'
        })
            .populate('patientId', 'name email age gender')
            .populate('doctorId', 'name specialization')
            .populate('consultationId');

        if (!prescription) {
            return res.status(404).json({ message: 'No active prescription found for this consultation' });
        }

        // Authorization check
        if (req.user.role === 'patient' && prescription.patientId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        if (req.user.role === 'doctor' && prescription.doctorId._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        res.json(prescription);


    } catch (error) {
        console.error('Error fetching prescription:', error);
        res.status(500).json({
            message: 'Error fetching prescription',
            error: error.message
        });
    }
};

// Download prescription as PDF
exports.downloadPrescriptionPDF = async (req, res) => {
    try {
        const { id } = req.params;

        const prescription = await Prescription.findById(id)
            .populate('patientId', 'name email age gender')
            .populate('doctorId', 'name specialization')
            .populate('consultationId', 'diagnosis symptoms');

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        // Authorization check
        const Patient = require('../models/patient');
        const patient = await Patient.findById(prescription.patientId._id);

        if (req.user.role === 'patient' && patient.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        if (req.user.role === 'doctor') {
            const Doctor = require('../models/doctor');
            const doctor = await Doctor.findById(prescription.doctorId._id);
            if (doctor.userId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Unauthorized access' });
            }
        }

        // Generate PDF
        const { generatePrescriptionPDF } = require('../utils/pdfGenerator');
        const { fileName, filePath } = await generatePrescriptionPDF(prescription);

        // Send file
        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).json({ message: 'Error downloading prescription' });
            }
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            message: 'Error generating PDF',
            error: error.message
        });
    }
};
