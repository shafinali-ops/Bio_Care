const mongoose = require("mongoose")

const medicationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    dosage: {
        type: String,
        required: true
    },
    frequency: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: 'General'
    },
    price: {
        type: Number,
        default: 0
    },
    description: {
        type: String,
        default: ''
    },
    stock: {
        type: Number,
        default: 0
    },
    image: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Medication", medicationSchema)

