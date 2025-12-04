const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Not required for admin notifications
    },
    targetRole: {
        type: String,
        enum: ['patient', 'doctor', 'admin', 'pharmacist', 'lhw', 'all'],
        default: null
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: [
            'appointment', 'prescription', 'message', 'call', 'alert', 'general',
            'doctor_signup', 'patient_signup', 'appointment_booked', 'consultation_completed',
            'prescription_created', 'medicine_added', 'lhw_patient_registered'
        ],
        default: 'general'
    },
    callId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Call'
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedModel'
    },
    relatedModel: {
        type: String,
        enum: ['Doctor', 'Patient', 'Appointment', 'Consultation', 'Prescription', 'Medicine', 'User']
    },
    date: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            ret.id = ret._id;
            return ret;
        }
    }
})

module.exports = mongoose.model("Notification", notificationSchema)
