const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
    medicine_name: {
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
    duration: {
        type: String,
        required: true
    },
    instructions: {
        type: String
    }
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
    consultationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Consultation',
        required: true
    },
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
    medicines: {
        type: [medicineSchema],
        required: true,
        validate: {
            validator: function (v) {
                return v && v.length > 0;
            },
            message: 'Medicines array must have at least one entry'
        }
    },
    follow_up_date: {
        type: Date
    },
    prescription_date: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'cancelled'],
        default: 'active'
    },
    // Pharmacist fields
    collectionStatus: {
        type: String,
        enum: ['pending', 'collected', 'partially-collected'],
        default: 'pending'
    },
    collectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Pharmacist who dispensed
    },
    collectedAt: {
        type: Date
    },
    pharmacistNotes: {
        type: String
    },
    // Legacy fields for backward compatibility
    medication: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medication'
    }],
    pharmacies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pharmacy'
    }],
    instructions: {
        type: String
    }
}, {
    timestamps: true
});

// Index for faster queries
prescriptionSchema.index({ patientId: 1, prescription_date: -1 });
prescriptionSchema.index({ doctorId: 1, prescription_date: -1 });
prescriptionSchema.index({ consultationId: 1 });
prescriptionSchema.index({ status: 1 });

module.exports = mongoose.model("Prescription", prescriptionSchema);
