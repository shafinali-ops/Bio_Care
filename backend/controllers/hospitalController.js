const Hospital = require('../models/hospital')

exports.getNearbyHospitals = async (req, res) => {
    try {
        const { location } = req.query
        const hospitals = await Hospital.find({
            location: { $regex: location, $options: 'i' }
        }).populate('doctors')
        res.json(hospitals)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.createHospital = async (req, res) => {
    try {
        const { name, location, specialization } = req.body
        const hospital = new Hospital({ name, location, specialization })
        await hospital.save()
        res.status(201).json(hospital)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getAllHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find().populate('doctors')
        res.json(hospitals)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

