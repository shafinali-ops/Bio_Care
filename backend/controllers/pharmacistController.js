const Prescription = require('../models/prescription');
const Medication = require('../models/medication');
const User = require('../models/user');

// Get all prescriptions (pending and collected)
exports.getPrescriptions = async (req, res) => {
    try {
        const { status } = req.query; // 'pending', 'collected', 'all'

        let filter = {};
        if (status === 'pending') {
            filter.collectionStatus = 'pending';
        } else if (status === 'collected') {
            filter.collectionStatus = { $in: ['collected', 'partially-collected'] };
        }

        const prescriptions = await Prescription.find(filter)
            .populate('patientId', 'name age gender')
            .populate('doctorId', 'name specialization')
            .populate('collectedBy', 'name email')
            .sort({ prescription_date: -1 });

        res.status(200).json({
            count: prescriptions.length,
            prescriptions
        });
    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        res.status(500).json({
            message: 'Error fetching prescriptions',
            error: error.message
        });
    }
};

// Get a specific prescription by ID
exports.getPrescriptionById = async (req, res) => {
    try {
        const { id } = req.params;

        const prescription = await Prescription.findById(id)
            .populate('patientId', 'name age gender')
            .populate('doctorId', 'name specialization')
            .populate('collectedBy', 'name email');

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        res.status(200).json({ prescription });
    } catch (error) {
        console.error('Error fetching prescription:', error);
        res.status(500).json({
            message: 'Error fetching prescription',
            error: error.message
        });
    }
};

// Mark prescription as collected
exports.markAsCollected = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const pharmacistId = req.user._id;

        const prescription = await Prescription.findById(id);

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        if (prescription.collectionStatus === 'collected') {
            return res.status(400).json({
                message: 'Prescription already marked as collected'
            });
        }

        // Update prescription
        prescription.collectionStatus = 'collected';
        prescription.collectedBy = pharmacistId;
        prescription.collectedAt = new Date();
        prescription.pharmacistNotes = notes || '';

        await prescription.save();

        // Update medicine inventory (reduce stock)
        for (const medicine of prescription.medicines) {
            const inventoryItem = await Medication.findOne({
                name: { $regex: new RegExp(medicine.medicine_name, 'i') }
            });

            if (inventoryItem && inventoryItem.stock > 0) {
                // Assume 1 unit dispensed per medicine (you can adjust this)
                inventoryItem.stock -= 1;
                await inventoryItem.save();
            }
        }

        await prescription.populate('patientId doctorId collectedBy');

        res.status(200).json({
            message: 'Prescription marked as collected',
            prescription
        });
    } catch (error) {
        console.error('Error marking prescription as collected:', error);
        res.status(500).json({
            message: 'Error marking prescription as collected',
            error: error.message
        });
    }
};

// Get all medicines in inventory
exports.getMedicines = async (req, res) => {
    try {
        const { status, category } = req.query;

        let filter = {};
        if (status) {
            filter.status = status;
        }
        if (category) {
            filter.category = category;
        }

        const medicines = await Medication.find(filter)
            .sort({ name: 1 });

        res.status(200).json({
            count: medicines.length,
            medicines
        });
    } catch (error) {
        console.error('Error fetching medicines:', error);
        res.status(500).json({
            message: 'Error fetching medicines',
            error: error.message
        });
    }
};

// Add a new medicine to inventory
// Add a new medicine to inventory
exports.addMedicine = async (req, res) => {
    try {
        const {
            name,
            category,
            dosage,
            frequency,
            price,
            stock,
            description
        } = req.body;

        // Check if medicine already exists
        const existingMedicine = await Medication.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingMedicine) {
            return res.status(400).json({
                message: 'Medication with this name already exists'
            });
        }

        const medication = new Medication({
            name,
            category,
            dosage,
            frequency,
            price: price || 0,
            stock: stock || 0,
            description: description || ''
        });

        await medication.save();

        res.status(201).json({
            message: 'Medication added successfully',
            medication
        });
    } catch (error) {
        console.error('Error adding medication:', error);
        res.status(500).json({
            message: 'Error adding medication',
            error: error.message
        });
    }
};

// Update medicine stock
// Update medicine stock
exports.updateMedicineStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, type } = req.body; // type: 'added', 'dispensed', 'expired', 'returned'

        const medication = await Medication.findById(id);

        if (!medication) {
            return res.status(404).json({ message: 'Medication not found' });
        }

        // Update stock
        if (type === 'added' || type === 'returned') {
            medication.stock += quantity;
        } else if (type === 'dispensed' || type === 'expired') {
            medication.stock -= quantity;
            if (medication.stock < 0) medication.stock = 0;
        }

        await medication.save();

        res.status(200).json({
            message: 'Medication stock updated successfully',
            medication
        });
    } catch (error) {
        console.error('Error updating medication stock:', error);
        res.status(500).json({
            message: 'Error updating medication stock',
            error: error.message
        });
    }
};

// Update medicine details
// Update medicine details
exports.updateMedicine = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const medication = await Medication.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!medication) {
            return res.status(404).json({ message: 'Medication not found' });
        }

        res.status(200).json({
            message: 'Medication updated successfully',
            medication
        });
    } catch (error) {
        console.error('Error updating medication:', error);
        res.status(500).json({
            message: 'Error updating medication',
            error: error.message
        });
    }
};

// Delete medicine
// Delete medicine
exports.deleteMedicine = async (req, res) => {
    try {
        const { id } = req.params;

        const medication = await Medication.findByIdAndDelete(id);

        if (!medication) {
            return res.status(404).json({ message: 'Medication not found' });
        }

        res.status(200).json({
            message: 'Medication deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting medication:', error);
        res.status(500).json({
            message: 'Error deleting medication',
            error: error.message
        });
    }
};

// Search medicines
// Search medicines
exports.searchMedicines = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const medicines = await Medication.find({
            name: { $regex: query, $options: 'i' }
        }).sort({ name: 1 });

        res.status(200).json({
            count: medicines.length,
            medicines
        });
    } catch (error) {
        console.error('Error searching medications:', error);
        res.status(500).json({
            message: 'Error searching medications',
            error: error.message
        });
    }
};

// Get low stock medicines
// Get low stock medicines
exports.getLowStockMedicines = async (req, res) => {
    try {
        const medicines = await Medication.find({
            stock: { $lte: 10 }
        }).sort({ stock: 1 });

        res.status(200).json({
            count: medicines.length,
            medicines
        });
    } catch (error) {
        console.error('Error fetching low stock medications:', error);
        res.status(500).json({
            message: 'Error fetching low stock medications',
            error: error.message
        });
    }
};

// Check medicine availability for a prescription
exports.checkPrescriptionAvailability = async (req, res) => {
    try {
        const { id } = req.params;

        const prescription = await Prescription.findById(id);

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        const availability = [];

        for (const medicine of prescription.medicines) {
            const inventoryItem = await Medication.findOne({
                name: { $regex: new RegExp(medicine.medicine_name, 'i') }
            });

            availability.push({
                medicine: medicine.medicine_name,
                dosage: medicine.dosage,
                available: inventoryItem ? inventoryItem.stock > 0 : false,
                stock: inventoryItem ? inventoryItem.stock : 0,
                status: inventoryItem ? (inventoryItem.stock > 0 ? 'available' : 'out-of-stock') : 'not-found'
            });
        }

        res.status(200).json({
            prescriptionId: id,
            availability
        });
    } catch (error) {
        console.error('Error checking prescription availability:', error);
        res.status(500).json({
            message: 'Error checking prescription availability',
            error: error.message
        });
    }
};
