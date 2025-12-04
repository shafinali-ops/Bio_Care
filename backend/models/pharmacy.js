const mongoose = require("mongoose")

const pharmacySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    prescriptions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prescription'
    }]
}, {
    timestamps: true
})

module.exports = mongoose.model("Pharmacy", pharmacySchema)

