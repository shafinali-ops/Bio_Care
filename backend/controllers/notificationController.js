const Notification = require('../models/notification')
const User = require('../models/user')
const Doctor = require('../models/doctor')
const Patient = require('../models/patient')

exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ date: -1 })
        res.json(notifications)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get all admin notifications (for admin dashboard)
exports.getAdminNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ targetRole: 'admin' })
            .sort({ date: -1 })
            .limit(100)
        res.json(notifications)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.createNotification = async (req, res) => {
    try {
        const { userId, message, type, targetRole } = req.body

        const notification = new Notification({
            userId: userId || req.user._id,
            message,
            type: type || 'general',
            targetRole
        })
        await notification.save()

        res.status(201).json(notification)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        )
        res.json(notification)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Mark all admin notifications as read
exports.markAllAdminAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { targetRole: 'admin', read: false },
            { read: true }
        )
        res.json({ message: 'All notifications marked as read' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Create notification when appointment is booked
exports.notifyAppointmentBooking = async (doctorId, patientId, appointmentDate) => {
    try {
        const doctor = await Doctor.findById(doctorId).populate('userId')
        const patient = await Patient.findById(patientId).populate('userId')

        if (doctor && doctor.userId) {
            const notification = new Notification({
                userId: doctor.userId._id,
                message: `New appointment booked by ${patient.name || 'Patient'} on ${new Date(appointmentDate).toLocaleDateString()}`,
                type: 'appointment'
            })
            await notification.save()
        }

        // Admin notification
        const adminNotification = new Notification({
            targetRole: 'admin',
            message: `📅 ${patient?.name || 'A patient'} booked an appointment with Dr. ${doctor?.name || 'Unknown'}`,
            type: 'appointment_booked',
            relatedModel: 'Appointment'
        })
        await adminNotification.save()
    } catch (error) {
        console.error('Failed to create appointment notification:', error)
    }
}

// Create notification when appointment status changes
exports.notifyAppointmentStatus = async (patientUserId, doctorName, status) => {
    try {
        const message = status === 'accepted'
            ? `Dr. ${doctorName} has accepted your appointment request`
            : `Dr. ${doctorName} has rejected your appointment request`

        const notification = new Notification({
            userId: patientUserId,
            message,
            type: 'appointment'
        })
        await notification.save()
    } catch (error) {
        console.error('Failed to create appointment status notification:', error)
    }
}

// Admin notification: Doctor signup
exports.notifyDoctorSignup = async (doctorName, specialization) => {
    try {
        const notification = new Notification({
            targetRole: 'admin',
            message: `👨‍⚕️ New doctor registered: Dr. ${doctorName} (${specialization})`,
            type: 'doctor_signup',
            relatedModel: 'Doctor'
        })
        await notification.save()
    } catch (error) {
        console.error('Failed to create doctor signup notification:', error)
    }
}

// Admin notification: Patient signup
exports.notifyPatientSignup = async (patientName) => {
    try {
        const notification = new Notification({
            targetRole: 'admin',
            message: `🧑‍🤝‍🧑 New patient registered: ${patientName}`,
            type: 'patient_signup',
            relatedModel: 'Patient'
        })
        await notification.save()
    } catch (error) {
        console.error('Failed to create patient signup notification:', error)
    }
}

// Admin notification: Consultation completed
exports.notifyConsultationCompleted = async (doctorName, patientName) => {
    try {
        const notification = new Notification({
            targetRole: 'admin',
            message: `✅ Dr. ${doctorName} completed consultation with ${patientName}`,
            type: 'consultation_completed',
            relatedModel: 'Consultation'
        })
        await notification.save()
    } catch (error) {
        console.error('Failed to create consultation notification:', error)
    }
}

// Admin notification: Prescription created
exports.notifyPrescriptionCreated = async (doctorName, patientName) => {
    try {
        const notification = new Notification({
            targetRole: 'admin',
            message: `💊 Dr. ${doctorName} created a prescription for ${patientName}`,
            type: 'prescription_created',
            relatedModel: 'Prescription'
        })
        await notification.save()
    } catch (error) {
        console.error('Failed to create prescription notification:', error)
    }
}

// Admin notification: Medicine added by pharmacist
exports.notifyMedicineAdded = async (medicineName, pharmacistName) => {
    try {
        const notification = new Notification({
            targetRole: 'admin',
            message: `💉 Pharmacist ${pharmacistName || 'Unknown'} added new medicine: ${medicineName}`,
            type: 'medicine_added',
            relatedModel: 'Medicine'
        })
        await notification.save()
    } catch (error) {
        console.error('Failed to create medicine notification:', error)
    }
}

// Admin notification: LHW registered patient
exports.notifyLHWPatientRegistered = async (lhwName, patientName) => {
    try {
        const notification = new Notification({
            targetRole: 'admin',
            message: `🏥 LHW ${lhwName || 'Unknown'} registered a new patient: ${patientName}`,
            type: 'lhw_patient_registered',
            relatedModel: 'Patient'
        })
        await notification.save()
    } catch (error) {
        console.error('Failed to create LHW patient registration notification:', error)
    }
}
