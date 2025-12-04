const Appointment = require('../models/appointment')
const Doctor = require('../models/doctor')
const Patient = require('../models/patient')
const Availability = require('../models/availability')
const { notifyAppointmentBooking, notifyAppointmentStatus } = require('./notificationController')

exports.createAppointment = async (req, res) => {
    try {
        const { doctorId, date, time, startTime, endTime, reason_for_visit } = req.body;

        console.log('📅 Creating appointment...');
        console.log('Request body:', req.body);

        // Validate required fields
        if (!doctorId || !reason_for_visit) {
            return res.status(400).json({
                message: 'doctorId and reason_for_visit are required'
            });
        }

        // Get patient from authenticated user
        const patient = await Patient.findOne({ userId: req.user._id });
        if (!patient) {
            return res.status(404).json({ message: 'Patient profile not found' });
        }

        // Calculate startTime and endTime if not provided
        let appointmentStart, appointmentEnd;

        if (startTime && endTime) {
            // Use provided startTime/endTime
            appointmentStart = new Date(startTime);
            appointmentEnd = new Date(endTime);
        } else if (date && time) {
            // Calculate from date + time (backward compatibility)
            const appointmentDate = new Date(date);
            const [hours, minutes] = time.split(':');
            appointmentStart = new Date(appointmentDate);
            appointmentStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Default 1-hour appointment
            appointmentEnd = new Date(appointmentStart);
            appointmentEnd.setHours(appointmentStart.getHours() + 1);
        } else {
            return res.status(400).json({
                message: 'Either (startTime, endTime) or (date, time) must be provided'
            });
        }

        // Validate times
        const now = new Date();
        if (appointmentStart < now) {
            return res.status(400).json({
                message: 'Cannot book appointments in the past'
            });
        }

        if (appointmentEnd <= appointmentStart) {
            return res.status(400).json({
                message: 'End time must be after start time'
            });
        }

        console.log('Appointment window:', appointmentStart, 'to', appointmentEnd);

        // 1. Check if time is within doctor's available slots
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Get the appointment date (without time)
        const appointmentDate = new Date(appointmentStart);
        appointmentDate.setHours(0, 0, 0, 0);

        // Check for date-specific availability first
        let availabilitySlots = [];
        const specificAvailability = await Availability.findOne({
            doctorId: doctor._id,
            date: appointmentDate
        });

        if (specificAvailability && specificAvailability.slots.length > 0) {
            availabilitySlots = specificAvailability.slots;
            console.log('Using date-specific availability:', availabilitySlots);
        } else {
            // Fall back to default availability
            availabilitySlots = doctor.availability || [];
            console.log('Using default availability:', availabilitySlots);
        }

        if (availabilitySlots.length > 0) {
            let isWithinSlot = false;

            // Helper to parse time string "HH:MM" or "HH:MM AM/PM"
            const parseTime = (timeStr) => {
                const cleaned = timeStr.trim().toLowerCase();
                const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
                if (match24) return { h: parseInt(match24[1]), m: parseInt(match24[2]) };

                const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
                if (match12) {
                    let h = parseInt(match12[1]);
                    const m = parseInt(match12[2]);
                    if (match12[3] === 'pm' && h !== 12) h += 12;
                    else if (match12[3] === 'am' && h === 12) h = 0;
                    return { h, m };
                }
                return null;
            };

            for (const slot of availabilitySlots) {
                const start = parseTime(slot.from);
                const end = parseTime(slot.to);

                if (start && end) {
                    const slotStart = new Date(appointmentStart);
                    slotStart.setHours(start.h, start.m, 0, 0);

                    const slotEnd = new Date(appointmentStart);
                    slotEnd.setHours(end.h, end.m, 0, 0);

                    // Check if appointment is fully within this slot
                    if (appointmentStart >= slotStart && appointmentEnd <= slotEnd) {
                        isWithinSlot = true;
                        break;
                    }
                }
            }

            if (!isWithinSlot) {
                return res.status(400).json({
                    message: "Selected time is outside the doctor's available hours."
                });
            }
        }

        // 2. Check doctor availability - no overlapping appointments
        console.log('Checking doctor availability...');
        const doctorConflict = await Appointment.findOne({
            doctorId,
            status: { $in: ['pending', 'approved', 'accepted'] }, // Added 'accepted'
            $or: [
                { startTime: { $lt: appointmentEnd }, endTime: { $gt: appointmentStart } }
            ]
        });

        if (doctorConflict) {
            console.log('❌ Doctor conflict found:', doctorConflict);
            return res.status(409).json({
                message: 'Doctor is already booked for this time.'
            });
        }

        // 3. Check patient double-booking (CANNOT have any other appointment at this time)
        console.log('Checking patient double-booking...');
        const patientConflict = await Appointment.findOne({
            patientId: patient._id,
            status: { $in: ['pending', 'approved', 'accepted'] }, // Added 'accepted'
            $or: [
                { startTime: { $lt: appointmentEnd }, endTime: { $gt: appointmentStart } }
            ]
        });

        if (patientConflict) {
            console.log('❌ Patient double-booking found');
            return res.status(409).json({
                message: 'You already have an appointment at this time.'
            });
        }

        console.log('✅ No conflicts found. Creating appointment...');

        // Create appointment
        const appointment = new Appointment({
            patientId: patient._id,
            doctorId,
            date: appointmentStart, // Store start time as date for backward compatibility
            time: time || `${appointmentStart.getHours()}:${String(appointmentStart.getMinutes()).padStart(2, '0')}`,
            startTime: appointmentStart,
            endTime: appointmentEnd,
            reason_for_visit,
            status: 'pending'
        });

        await appointment.save();
        console.log('✅ Appointment created:', appointment._id);

        // Populate for response
        await appointment.populate('patientId doctorId');

        // Emit real-time notification to doctor
        const io = req.app.get('io');
        if (io) {
            const doctor = await Doctor.findById(doctorId).populate('userId');
            if (doctor && doctor.userId) {
                // Save notification to DB
                await notifyAppointmentBooking(doctorId, patient._id, appointmentStart);

                io.to(`user:${doctor.userId._id}`).emit('appointment_booked', {
                    appointmentId: appointment._id,
                    patientName: appointment.patientId.name,
                    startTime: appointmentStart,
                    endTime: appointmentEnd,
                    reason: reason_for_visit,
                    message: `New appointment request from ${appointment.patientId.name}`
                });
            }
        }

        res.status(201).json(appointment);

    } catch (error) {
        console.error('❌ Error creating appointment:', error);
        res.status(500).json({ message: error.message });
    }
}

exports.getAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('patientId')
            .populate('doctorId')
        res.json(appointments)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patientId')
            .populate('doctorId')
        res.json(appointment)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.updateAppointment = async (req, res) => {
    try {
        const { status } = req.body
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        )
            .populate('patientId')
            .populate('doctorId')

        // Create notification for patient if doctor accepts/rejects
        if (status === 'accepted' || status === 'rejected') {
            const { notifyAppointmentStatus } = require('./notificationController')
            await notifyAppointmentStatus(appointment.patientId.userId, appointment.doctorId.name, status)
        }

        res.json(appointment)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.acceptAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: 'accepted' },
            { new: true }
        )
            .populate('patientId')
            .populate('doctorId')

        await notifyAppointmentStatus(appointment.patientId.userId, appointment.doctorId.name, 'accepted')

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${appointment.patientId.userId}`).emit('appointment_approved', {
                appointmentId: appointment._id,
                doctorName: appointment.doctorId.name,
                date: appointment.date,
                time: appointment.time,
                message: `Your appointment with Dr. ${appointment.doctorId.name} has been approved`
            });
        }

        res.json(appointment)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.rejectAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: 'rejected' },
            { new: true }
        )
            .populate('patientId')
            .populate('doctorId')

        await notifyAppointmentStatus(appointment.patientId.userId, appointment.doctorId.name, 'rejected')

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${appointment.patientId.userId}`).emit('appointment_rejected', {
                appointmentId: appointment._id,
                doctorName: appointment.doctorId.name,
                message: `Your appointment with Dr. ${appointment.doctorId.name} has been rejected`
            });
        }

        res.json(appointment)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status: 'cancelled' },
            { new: true }
        )
        res.json(appointment)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.completeAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Only doctor can mark as completed
        if (req.user.role !== 'doctor') {
            return res.status(403).json({ message: 'Only doctors can mark appointments as completed' });
        }

        // Check if appointment is approved
        if (appointment.status !== 'approved' && appointment.status !== 'accepted') {
            return res.status(400).json({
                message: 'Only approved/accepted appointments can be marked as completed'
            });
        }

        appointment.status = 'completed';
        await appointment.save();

        const populatedAppointment = await Appointment.findById(appointment._id)
            .populate('patientId')
            .populate('doctorId');

        res.json(populatedAppointment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.rescheduleAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { startTime, endTime, date, time } = req.body;

        console.log('📅 Rescheduling appointment:', id);
        console.log('New times:', { startTime, endTime, date, time });

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if consultation already exists
        const Consultation = require('../models/consultation');
        const existingConsultation = await Consultation.findOne({ appointmentId: id });
        if (existingConsultation) {
            return res.status(400).json({
                message: 'Cannot reschedule appointment - consultation already exists. Please create a new appointment instead.'
            });
        }

        // Calculate new times
        let newStart, newEnd;
        if (startTime && endTime) {
            newStart = new Date(startTime);
            newEnd = new Date(endTime);
        } else if (date && time) {
            const appointmentDate = new Date(date);
            const [hours, minutes] = time.split(':');
            newStart = new Date(appointmentDate);
            newStart.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            newEnd = new Date(newStart);
            newEnd.setHours(newStart.getHours() + 1);
        } else {
            return res.status(400).json({
                message: 'Either (startTime, endTime) or (date, time) must be provided'
            });
        }

        // Validate times
        const now = new Date();
        if (newStart < now) {
            return res.status(400).json({
                message: 'Cannot reschedule to past time'
            });
        }

        if (newEnd <= newStart) {
            return res.status(400).json({
                message: 'End time must be after start time'
            });
        }

        // Check doctor availability (excluding current appointment)
        const doctorConflict = await Appointment.findOne({
            _id: { $ne: id },
            doctorId: appointment.doctorId,
            status: { $in: ['pending', 'approved'] },
            $or: [
                { startTime: { $lte: newStart }, endTime: { $gt: newStart } },
                { startTime: { $lt: newEnd }, endTime: { $gte: newEnd } },
                { startTime: { $gte: newStart }, endTime: { $lte: newEnd } }
            ]
        });

        if (doctorConflict) {
            return res.status(409).json({
                message: 'Doctor is not available at the new time. Please choose a different slot.'
            });
        }

        // Update appointment
        appointment.date = newStart;
        appointment.time = time || `${newStart.getHours()}:${String(newStart.getMinutes()).padStart(2, '0')}`;
        appointment.startTime = newStart;
        appointment.endTime = newEnd;
        await appointment.save();

        await appointment.populate('patientId doctorId');

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
            // Notify patient
            const Patient = require('../models/patient');
            const patient = await Patient.findById(appointment.patientId).populate('userId');
            if (patient && patient.userId) {
                io.to(`user:${patient.userId._id}`).emit('appointment_rescheduled', {
                    appointmentId: appointment._id,
                    newStartTime: newStart,
                    newEndTime: newEnd,
                    message: 'Your appointment has been rescheduled'
                });
            }

            // Notify doctor
            const Doctor = require('../models/doctor');
            const doctor = await Doctor.findById(appointment.doctorId).populate('userId');
            if (doctor && doctor.userId) {
                io.to(`user:${doctor.userId._id}`).emit('appointment_rescheduled', {
                    appointmentId: appointment._id,
                    newStartTime: newStart,
                    newEndTime: newEnd,
                    message: 'Appointment has been rescheduled'
                });
            }
        }

        res.json({
            message: 'Appointment rescheduled successfully',
            appointment
        });

    } catch (error) {
        console.error('❌ Error rescheduling appointment:', error);
        res.status(500).json({ message: error.message });
    }
};
