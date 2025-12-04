const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
    },
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
    symptoms: {
        type: [String],
        required: true
    },
    doctor_notes: {
        type: String
    },
    diagnosis: {
        type: String,
        required: true
    },
    recommended_tests: {
        type: [String],
        default: []
    },
    consultation_date: {
        type: Date,
        default: Date.now
    },
    consultation_status: {
        type: String,
        enum: ['PENDING', 'READY', 'ACTIVE', 'ENDED', 'CANCELLED'],
        default: 'PENDING'
    },
    started_at: {
        type: Date
    },
    completed_at: {
        type: Date
    },
    call_duration: {
        type: Number, // in seconds
        default: 0
    },
    last_message: {
        type: String
    },
    last_message_time: {
        type: Date
    },
    // Legacy fields for backward compatibility
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
        default: 'completed'
    },
    reportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report'
    },
    callId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Call'
    }
}, {
    timestamps: true
});

// Index for faster queries
consultationSchema.index({ patientId: 1, consultation_date: -1 });
consultationSchema.index({ doctorId: 1, consultation_date: -1 });
consultationSchema.index({ appointmentId: 1 });

module.exports = mongoose.model("Consultation", consultationSchema);
