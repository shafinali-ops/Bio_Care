const mongoose = require("mongoose")

const hospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    specialization: [{
        type: String
    }],
    doctors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor'
    }]
}, {
    timestamps: true
})

module.exports = mongoose.model("Hospital", hospitalSchema)

