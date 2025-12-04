const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ['text', 'voice', 'file'],
        default: 'text'
    },
    language: {
        type: String,
        enum: ['en', 'ur', 'auto'],
        default: 'en'
    },
    // For file uploads
    attachments: [{
        filename: String,
        filepath: String,
        fileType: String,
        extractedText: String
    }],
    // AI Response data
    aiResponse: {
        patient_query: String,
        symptoms_detected: [String],
        report_summary: String,
        possible_conditions: [{
            name: String,
            confidence: String
        }],
        triage_level: String,
        urgency_category: String,
        is_emergency: Boolean,
        home_care_advice: [String],
        avoid_these: [String],
        recommended_otc_medicines: [{
            name: String,
            dosage_note: String
        }],
        warning_signs_to_monitor: [String],
        when_to_visit_doctor: [String],
        recommendation: String,
        urgency_statement: String,
        consult_doctor_immediately: Boolean
    },
    // Pinecone vector ID for context retrieval
    vectorId: String,
    // Audio file path for voice messages
    audioPath: String,
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
chatMessageSchema.index({ userId: 1, sessionId: 1, createdAt: -1 });
chatMessageSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
