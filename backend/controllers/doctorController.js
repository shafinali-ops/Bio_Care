const Doctor = require('../models/doctor')
const Patient = require('../models/patient')
const Consultation = require('../models/consultation')
const Appointment = require('../models/appointment')
const Prescription = require('../models/prescription')
const HealthRecord = require('../models/healthRecord')
const Hospital = require('../models/hospital')
const Availability = require('../models/availability')
const Vital = require('../models/vital')
const SymptomCheck = require('../models/symptomCheck')

exports.getProfile = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user._id })
            .populate('hospitalId')
        res.json(doctor)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.updateAvailability = async (req, res) => {
    try {
        console.log('📅 updateAvailability called');
        console.log('Request body:', req.body);
        console.log('User ID:', req.user._id);

        const { availability, date } = req.body
        const doctor = await Doctor.findOne({ userId: req.user._id });

        if (!doctor) {
            console.error('❌ Doctor profile not found for user:', req.user._id);
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        console.log('✅ Doctor found:', doctor._id);

        if (date) {
            // Create NEW date-specific availability document (always create, never update)
            console.log('📆 Creating NEW date-specific availability for:', date);
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);

            console.log('Target date (normalized):', targetDate);
            console.log('Slots to save:', availability);

            // Create new document (no upsert, always insert)
            const availabilityDoc = await Availability.create({
                doctorId: doctor._id,
                date: targetDate,
                slots: availability
            });

            console.log('✅ NEW date-specific availability created:', availabilityDoc);

            res.json({
                message: 'Date-specific availability saved',
                availability: availabilityDoc
            });
        } else {
            // Update default availability in Doctor model
            console.log('📋 Saving default availability');
            console.log('Slots to save:', availability);

            doctor.availability = availability;
            await doctor.save();

            console.log('✅ Default availability saved to doctor:', doctor._id);
            console.log('Doctor availability:', doctor.availability);

            res.json(doctor);
        }
    } catch (error) {
        console.error('❌ Error in updateAvailability:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: error.message })
    }
}

exports.getPatients = async (req, res) => {
    try {
        const patients = await Patient.find().populate('userId')
        res.json(patients)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getConsultations = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user._id })
        const consultations = await Consultation.find({ doctorId: doctor._id })
            .populate('patientId')
        res.json(consultations)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getAppointments = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user._id })
        const appointments = await Appointment.find({ doctorId: doctor._id })
            .populate('patientId')
        res.json(appointments)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.viewMedicalHistory = async (req, res) => {
    try {
        const { patientId } = req.params
        const healthRecord = await HealthRecord.findOne({ patientId })
            .populate('records')
            .populate('reports')
        res.json(healthRecord || { records: [], reports: [] })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.suggestHospital = async (req, res) => {
    try {
        const { location, condition } = req.body
        const hospitals = await Hospital.find({
            location: { $regex: location, $options: 'i' },
            specialization: { $in: [condition] }
        })
        res.json(hospitals)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.toggleAvailability = async (req, res) => {
    try {
        const { isAvailable, currentStatus } = req.body
        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user._id },
            {
                isAvailable,
                currentStatus: currentStatus || (isAvailable ? 'available' : 'offline')
            },
            { new: true }
        )
        res.json(doctor)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getAvailableDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find({
            isAvailable: true,
            status: 'approved'
        }).populate('hospitalId').populate('userId')
        res.json(doctors)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find({ status: 'approved' }).populate('hospitalId').populate('userId')
        res.json(doctors)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get available time slots for a doctor on a specific date
exports.getAvailableSlots = async (req, res) => {
    try {
        const { doctorId, date } = req.query

        if (!doctorId || !date) {
            return res.status(400).json({ message: 'doctorId and date are required' })
        }

        // Find doctor
        const doctor = await Doctor.findById(doctorId)
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' })
        }

        // Parse the date
        const selectedDate = new Date(date)
        selectedDate.setHours(0, 0, 0, 0)

        // Get doctor's availability slots
        let availabilitySlots = doctor.availability || []

        // Check for date-specific availability in Availability collection
        const specificAvailability = await Availability.findOne({
            doctorId: doctor._id,
            date: selectedDate
        });

        if (specificAvailability && specificAvailability.slots.length > 0) {
            availabilitySlots = specificAvailability.slots;
        }

        if (availabilitySlots.length === 0) {
            return res.json({ availableSlots: [], message: 'Doctor has not set availability' })
        }

        // Get all appointments for this doctor on this date
        const startOfDay = new Date(selectedDate)
        const endOfDay = new Date(selectedDate)
        endOfDay.setHours(23, 59, 59, 999)

        const bookedAppointments = await Appointment.find({
            doctorId,
            status: { $in: ['pending', 'approved', 'accepted'] },
            startTime: { $gte: startOfDay, $lte: endOfDay }
        })

        // Convert availability slots to full datetime and check against booked appointments
        const availableSlots = []

        for (const slot of availabilitySlots) {
            // Parse slot times (format: "14:00" or "2:00 PM")
            const slotStart = parseTimeString(slot.from)
            const slotEnd = parseTimeString(slot.to)

            if (!slotStart || !slotEnd) continue

            // Create datetime for this slot on the selected date
            const slotStartTime = new Date(selectedDate)
            slotStartTime.setHours(slotStart.hours, slotStart.minutes, 0, 0)

            const slotEndTime = new Date(selectedDate)
            slotEndTime.setHours(slotEnd.hours, slotEnd.minutes, 0, 0)

            // Check if this slot overlaps with any booked appointment
            const isBooked = bookedAppointments.some(apt => {
                const aptStart = new Date(apt.startTime)
                const aptEnd = new Date(apt.endTime)

                // Check for overlap
                return (aptStart < slotEndTime && aptEnd > slotStartTime)
            })

            if (!isBooked) {
                availableSlots.push({
                    from: slot.from,
                    to: slot.to,
                    startTime: slotStartTime.toISOString(),
                    endTime: slotEndTime.toISOString(),
                    available: true
                })
            }
        }

        res.json({ availableSlots, totalSlots: availabilitySlots.length })

    } catch (error) {
        console.error('Error getting available slots:', error)
        res.status(500).json({ message: error.message })
    }
}

// Helper function to parse time strings
function parseTimeString(timeStr) {
    if (!timeStr) return null

    // Remove spaces and convert to lowercase
    const cleaned = timeStr.trim().toLowerCase()

    // Try to match HH:MM format (24-hour)
    const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/)
    if (match24) {
        return {
            hours: parseInt(match24[1]),
            minutes: parseInt(match24[2])
        }
    }

    // Try to match HH:MM AM/PM format (12-hour)
    const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)
    if (match12) {
        let hours = parseInt(match12[1])
        const minutes = parseInt(match12[2])
        const period = match12[3]

        if (period === 'pm' && hours !== 12) {
            hours += 12
        } else if (period === 'am' && hours === 12) {
            hours = 0
        }

        return { hours, minutes }
    }

    return null
}

// Get dashboard statistics for doctor
exports.getDashboardStats = async (req, res) => {
    try {
        console.log('\n=== Doctor getDashboardStats DEBUG ===');
        console.log('User ID from token:', req.user._id);
        console.log('User role:', req.user.role);

        const doctor = await Doctor.findOne({ userId: req.user._id }).populate('userId', 'email');
        console.log('Doctor found:', doctor ? `Yes (ID: ${doctor._id})` : 'No');

        if (!doctor) {
            console.log('❌ No doctor profile found for user:', req.user._id);
            return res.status(404).json({ message: 'Doctor profile not found' });
        }

        console.log('Doctor details:', {
            _id: doctor._id,
            name: doctor.name,
            userId: doctor.userId ? doctor.userId._id : 'not populated'
        });

        console.log('\nQuerying with doctorId:', doctor._id);

        const totalAppointments = await Appointment.countDocuments({ doctorId: doctor._id });
        console.log('Total Appointments found:', totalAppointments);

        const totalConsultations = await Consultation.countDocuments({ doctorId: doctor._id });
        console.log('Total Consultations found:', totalConsultations);

        const totalPrescriptions = await Prescription.countDocuments({ doctorId: doctor._id });
        console.log('Total Prescriptions found:', totalPrescriptions);

        // Also check if there are ANY records with different doctorId formats
        const allAppointments = await Appointment.countDocuments();
        const allConsultations = await Consultation.countDocuments();
        const allPrescriptions = await Prescription.countDocuments();

        console.log('\nTotal records in collections:');
        console.log('  All Appointments:', allAppointments);
        console.log('  All Consultations:', allConsultations);
        console.log('  All Prescriptions:', allPrescriptions);

        const response = {
            profile: {
                name: doctor.name,
                specialization: doctor.specialization,
                email: doctor.userId ? doctor.userId.email : '',
                doctorId: doctor._id
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
        console.error('❌ Error fetching doctor dashboard stats:', error);
        res.status(500).json({ message: error.message });
    }
};
exports.getHighRiskPatients = async (req, res) => {
    try {
        // 1. Find critical/warning vitals from the last 7 days
        const criticalVitals = await Vital.find({
            alertLevel: { $in: ['critical', 'warning'] },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }).populate('patientId').sort({ createdAt: -1 });

        // 2. Find high/critical symptom checks from the last 7 days
        const criticalSymptoms = await SymptomCheck.find({
            triage_level: { $in: ['high', 'critical'] },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }).populate('patientId').sort({ createdAt: -1 });

        // 3. Aggregate unique patients and their risks
        const patientMap = new Map();

        // Process Vitals
        criticalVitals.forEach(vital => {
            if (!vital.patientId) return;
            const pid = vital.patientId._id.toString();
            if (!patientMap.has(pid)) {
                patientMap.set(pid, {
                    patient: vital.patientId,
                    risks: [],
                    lastUpdate: vital.createdAt
                });
            }
            const pData = patientMap.get(pid);
            pData.risks.push({
                type: 'vital',
                level: vital.alertLevel,
                description: `Abnormal Vitals: ${vital.heartRate ? `HR: ${vital.heartRate}` : ''} ${vital.bloodPressure ? `BP: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic}` : ''} ${vital.oxygenSaturation ? `SpO2: ${vital.oxygenSaturation}%` : ''}`,
                date: vital.createdAt
            });
            if (vital.createdAt > pData.lastUpdate) pData.lastUpdate = vital.createdAt;
        });

        // Process Symptoms
        criticalSymptoms.forEach(symptom => {
            if (!symptom.patientId) return;
            const pid = symptom.patientId._id.toString();
            if (!patientMap.has(pid)) {
                patientMap.set(pid, {
                    patient: symptom.patientId,
                    risks: [],
                    lastUpdate: symptom.createdAt
                });
            }
            const pData = patientMap.get(pid);
            pData.risks.push({
                type: 'symptom',
                level: symptom.triage_level,
                description: `High Risk Symptoms: ${symptom.input_symptoms.slice(0, 3).join(', ')}`,
                date: symptom.createdAt
            });
            if (symptom.createdAt > pData.lastUpdate) pData.lastUpdate = symptom.createdAt;
        });

        // Convert map to array and sort by most recent risk
        const highRiskPatients = Array.from(patientMap.values())
            .sort((a, b) => b.lastUpdate - a.lastUpdate);

        res.json(highRiskPatients);
    } catch (error) {
        console.error('Error fetching high risk patients:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
