const VoiceNote = require('../models/voiceNote')
const Doctor = require('../models/doctor')

// Upload voice note
exports.uploadVoiceNote = async (req, res) => {
    try {
        // Handle both FormData and JSON requests
        const patientId = req.body.patientId || req.body.patientId
        const appointmentId = req.body.appointmentId || null
        const transcript = req.body.transcript || req.body.transcript || ''
        
        const doctor = await Doctor.findOne({ userId: req.user._id })

        if (!doctor) {
            return res.status(403).json({ message: 'Doctor not found' })
        }

        if (!patientId) {
            return res.status(400).json({ message: 'Patient ID is required' })
        }

        // Handle audio URL - can be base64 data URL or file path
        let audioUrl = req.body.audioUrl || req.body.audio || null
        
        // If audio file is uploaded via FormData (if multer is configured)
        if (req.file) {
            audioUrl = `/uploads/voice-notes/${req.file.filename}`
        } else if (!audioUrl) {
            // If no audio provided, create a placeholder
            audioUrl = `data:audio/wav;base64,placeholder`
        }

        const voiceNote = new VoiceNote({
            doctorId: doctor._id,
            patientId: String(patientId),
            appointmentId: appointmentId || undefined,
            audioUrl: audioUrl,
            transcript: transcript
        })
        await voiceNote.save()

        const populatedNote = await VoiceNote.findById(voiceNote._id)
            .populate('doctorId', 'name specialization')
            .populate('patientId', 'name')

        res.status(201).json(populatedNote)
    } catch (error) {
        console.error('Voice note upload error:', error)
        res.status(500).json({ message: error.message || 'Failed to upload voice note' })
    }
}

// Get voice notes for a patient
exports.getPatientVoiceNotes = async (req, res) => {
    try {
        const { patientId } = req.params
        const voiceNotes = await VoiceNote.find({ patientId })
            .populate('doctorId', 'name specialization')
            .populate('appointmentId')
            .sort({ createdAt: -1 })
        res.json(voiceNotes)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get voice notes by doctor
exports.getDoctorVoiceNotes = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user._id })
        const voiceNotes = await VoiceNote.find({ doctorId: doctor._id })
            .populate('patientId', 'name')
            .populate('appointmentId')
            .sort({ createdAt: -1 })
        res.json(voiceNotes)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get voice notes for current patient
exports.getMyVoiceNotes = async (req, res) => {
    try {
        const Patient = require('../models/patient')
        const patient = await Patient.findOne({ userId: req.user._id })
        
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' })
        }

        const voiceNotes = await VoiceNote.find({ patientId: patient._id })
            .populate('doctorId', 'name specialization')
            .populate('appointmentId')
            .sort({ createdAt: -1 })
        res.json(voiceNotes)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

