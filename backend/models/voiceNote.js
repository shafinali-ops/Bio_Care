const mongoose = require("mongoose")

const voiceNoteSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    audioUrl: {
        type: String,
        required: true
    },
    transcript: {
        type: String
    },
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("VoiceNote", voiceNoteSchema)

