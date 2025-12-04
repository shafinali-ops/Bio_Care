const mongoose = require("mongoose")

const vitalSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    heartRate: {
        type: Number,
        min: 0
    },
    bloodPressure: {
        systolic: Number,
        diastolic: Number
    },
    temperature: {
        type: Number
    },
    oxygenSaturation: {
        type: Number,
        min: 0,
        max: 100
    },
    weight: {
        type: Number
    },
    height: {
        type: Number
    },
    notes: {
        type: String
    },
    alertLevel: {
        type: String,
        enum: ['normal', 'warning', 'critical'],
        default: 'normal'
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Vital", vitalSchema)

