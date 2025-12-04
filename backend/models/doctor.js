const mongoose = require("mongoose")

const timeSlotSchema = new mongoose.Schema({
    from: String,
    to: String
})

const doctorSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    specialization: {
        type: String,
        required: true
    },
    availability: [timeSlotSchema], // Default weekly slots
    dateSpecificAvailability: [{
        date: {
            type: Date,
            required: true
        },
        slots: [timeSlotSchema]
    }],
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'blocked'],
        default: 'pending'
    },
    approvedAt: {
        type: Date
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    isAvailable: {
        type: Boolean,
        default: false
    },
    currentStatus: {
        type: String,
        enum: ['available', 'busy', 'offline'],
        default: 'offline'
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Doctor", doctorSchema)

