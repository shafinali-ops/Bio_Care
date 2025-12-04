const Appointment = require('../models/appointment');
const Doctor = require('../models/doctor');
const Patient = require('../models/patient');

let io = null;
let reminderIntervals = new Map();

// Initialize the consultation reminder system
const initializeConsultationReminders = (socketIO) => {
    io = socketIO;
    console.log('📅 Consultation reminder system initialized');

    // Check for upcoming consultations every minute
    setInterval(checkUpcomingConsultations, 60000);

    // Run immediately on startup
    checkUpcomingConsultations();
};

// Check for consultations starting in 5 minutes
const checkUpcomingConsultations = async () => {
    try {
        const now = new Date();
        const fiveMinutesLater = new Date(now.getTime() + 5 * 60000);
        const sixMinutesLater = new Date(now.getTime() + 6 * 60000);

        // Find appointments starting in the next 5-6 minutes
        const upcomingAppointments = await Appointment.find({
            status: 'approved',
            startTime: {
                $gte: fiveMinutesLater,
                $lt: sixMinutesLater
            }
        })
            .populate('patientId')
            .populate('doctorId');

        console.log(`🔔 Found ${upcomingAppointments.length} consultations starting in 5 minutes`);

        for (const appointment of upcomingAppointments) {
            // Check if we already sent reminder for this appointment
            const reminderKey = `${appointment._id}_${fiveMinutesLater.getTime()}`;

            if (!reminderIntervals.has(reminderKey)) {
                await sendConsultationReminder(appointment);
                reminderIntervals.set(reminderKey, true);

                // Clean up old reminders after 10 minutes
                setTimeout(() => {
                    reminderIntervals.delete(reminderKey);
                }, 10 * 60000);
            }
        }
    } catch (error) {
        console.error('❌ Error checking upcoming consultations:', error);
    }
};

// Send reminder to both patient and doctor
const sendConsultationReminder = async (appointment) => {
    if (!io) {
        console.error('Socket.IO not initialized');
        return;
    }

    try {
        const patient = await Patient.findById(appointment.patientId).populate('userId');
        const doctor = await Doctor.findById(appointment.doctorId).populate('userId');

        if (!patient || !doctor) {
            console.error('Patient or doctor not found for appointment:', appointment._id);
            return;
        }

        const reminderData = {
            appointmentId: appointment._id,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            date: appointment.date
        };

        // Send to patient
        if (patient.userId) {
            io.to(`user:${patient.userId._id}`).emit('consultation_reminder', {
                ...reminderData,
                doctorName: doctor.name,
                doctorSpecialization: doctor.specialization,
                message: `Your consultation with Dr. ${doctor.name} starts in 5 minutes!`
            });
            console.log(`✅ Sent reminder to patient: ${patient.name}`);
        }

        // Send to doctor
        if (doctor.userId) {
            io.to(`user:${doctor.userId._id}`).emit('consultation_reminder', {
                ...reminderData,
                patientName: patient.name,
                patientAge: patient.age,
                patientGender: patient.gender,
                message: `Consultation with ${patient.name} starts in 5 minutes!`
            });
            console.log(`✅ Sent reminder to doctor: ${doctor.name}`);
        }
    } catch (error) {
        console.error('❌ Error sending consultation reminder:', error);
    }
};

// Manually trigger a reminder (for testing)
const sendImmediateReminder = async (appointmentId) => {
    try {
        const appointment = await Appointment.findById(appointmentId)
            .populate('patientId')
            .populate('doctorId');

        if (!appointment) {
            throw new Error('Appointment not found');
        }

        await sendConsultationReminder(appointment);
        return { success: true, message: 'Reminder sent' };
    } catch (error) {
        console.error('Error sending immediate reminder:', error);
        throw error;
    }
};

module.exports = {
    initializeConsultationReminders,
    sendImmediateReminder
};
