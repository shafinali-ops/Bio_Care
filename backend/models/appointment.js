const mongoose = require("mongoose")

const appointmentSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String  // For backward compatibility: "14:00"
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    reason_for_visit: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    approved_at: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for efficient conflict checking
appointmentSchema.index({ doctorId: 1, startTime: 1, endTime: 1 });
appointmentSchema.index({ patientId: 1, doctorId: 1, startTime: 1 });
appointmentSchema.index({ status: 1, startTime: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema)

