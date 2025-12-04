const mongoose = require("mongoose")

const callSchema = new mongoose.Schema({
    callerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['ringing', 'accepted', 'rejected', 'ended', 'missed'],
        default: 'ringing'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: {
        type: Date
    },
    duration: {
        type: Number // in seconds
    },
    roomId: {
        type: String
    },
    callType: {
        type: String,
        enum: ['video', 'audio'],
        default: 'video'
    },
    consultationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Consultation'
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Call", callSchema)

