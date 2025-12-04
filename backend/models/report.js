const mongoose = require("mongoose")

const reportSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    consultationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Consultation'
    },
    healthRecordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HealthRecord'
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Report", reportSchema)

