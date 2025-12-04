const mongoose = require('mongoose');

const symptomCheckSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    input_symptoms: [{
        type: String,
        required: true
    }],
    symptom_severity_analysis: {
        type: Map,
        of: String,
        default: {}
    },
    possible_conditions: [{
        name: String,
        confidence: {
            type: String,
            enum: ['low', 'medium', 'high']
        }
    }],
    triage_level: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
    },
    urgency_category: {
        type: String,
        required: true
    },
    is_emergency: {
        type: Boolean,
        default: false
    },
    home_care_advice: [{
        type: String
    }],
    avoid_these: [{
        type: String
    }],
    recommended_otc_medicines: [{
        name: String,
        dosage_note: String
    }],
    warning_signs_to_monitor: [{
        type: String
    }],
    when_to_visit_doctor: [{
        type: String
    }],
    recommendation: {
        type: String,
        required: true
    },
    urgency_statement: {
        type: String,
        required: true
    },
    consult_doctor_immediately: {
        type: Boolean,
        default: false
    },
    check_date: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for faster queries
symptomCheckSchema.index({ patientId: 1, createdAt: -1 });
symptomCheckSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('SymptomCheck', symptomCheckSchema);
