const Medication = require('../models/medication')
const Pharmacy = require('../models/pharmacy')

// Get all medications (for patients to browse)
exports.getAllMedications = async (req, res) => {
    try {
        const { search, category } = req.query
        let query = {}

        if (search) {
            query.name = { $regex: search, $options: 'i' }
        }

        if (category) {
            query.category = category
        }

        const medications = await Medication.find(query).sort({ name: 1 })
        res.json(medications)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get medication by ID
exports.getMedicationById = async (req, res) => {
    try {
        const medication = await Medication.findById(req.params.id)
        if (!medication) {
            return res.status(404).json({ message: 'Medication not found' })
        }
        res.json(medication)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Admin: Create medication
exports.createMedication = async (req, res) => {
    try {
        const { name, dosage, frequency, category, price, description, stock, image } = req.body

        const medication = new Medication({
            name,
            dosage,
            frequency,
            category: category || 'General',
            price: price || 0,
            description: description || '',
            stock: stock || 0,
            image: image || ''
        })
        await medication.save()

        res.status(201).json(medication)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Admin: Update medication
exports.updateMedication = async (req, res) => {
    try {
        const medication = await Medication.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        )
        if (!medication) {
            return res.status(404).json({ message: 'Medication not found' })
        }
        res.json(medication)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Admin: Delete medication
exports.deleteMedication = async (req, res) => {
    try {
        const medication = await Medication.findByIdAndDelete(req.params.id)
        if (!medication) {
            return res.status(404).json({ message: 'Medication not found' })
        }
        res.json({ message: 'Medication deleted successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get medication categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Medication.distinct('category')
        res.json(categories)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}







