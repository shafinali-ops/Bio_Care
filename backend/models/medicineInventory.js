const mongoose = require("mongoose");

const medicineInventorySchema = new mongoose.Schema({
    medicineName: {
        type: String,
        required: true,
        unique: true
    },
    genericName: {
        type: String
    },
    dosage: {
        type: String, // e.g., "500mg", "10ml"
        default: ''
    },
    category: {
        type: String,
        enum: ['antibiotic', 'painkiller', 'antiviral', 'antifungal', 'vitamin', 'supplement', 'other'],
        default: 'other'
    },
    manufacturer: {
        type: String
    },
    description: {
        type: String
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    unit: {
        type: String,
        default: 'tablets'
    },
    price: {
        type: Number,
        default: 0
    },
    expiryDate: {
        type: Date
    },
    reorderLevel: {
        type: Number,
        default: 10
    },
    // Pharmacist who manages this medicine
    managedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Track stock updates
    stockHistory: [{
        quantity: Number,
        type: {
            type: String,
            enum: ['added', 'dispensed', 'expired', 'returned']
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: String,
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['available', 'low-stock', 'out-of-stock', 'discontinued'],
        default: 'available'
    }
}, {
    timestamps: true
});

// Auto-update status based on stock level
medicineInventorySchema.pre('save', function (next) {
    if (this.stock === 0) {
        this.status = 'out-of-stock';
    } else if (this.stock <= this.reorderLevel) {
        this.status = 'low-stock';
    } else {
        this.status = 'available';
    }
    next();
});

// Index for faster queries
medicineInventorySchema.index({ medicineName: 1 });
medicineInventorySchema.index({ status: 1 });
medicineInventorySchema.index({ category: 1 });

module.exports = mongoose.model("MedicineInventory", medicineInventorySchema);
