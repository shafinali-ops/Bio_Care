const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const Admin = require('../models/admin')
const Doctor = require('../models/doctor')
const Patient = require('../models/patient')
const { notifyDoctorSignup, notifyPatientSignup } = require('./notificationController')

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: '7d'
    })
}

exports.register = async (req, res) => {
    try {
        const { email, password, role, name, age, gender, specialization } = req.body

        // Check if user exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' })
        }

        // Validate required fields based on role
        if (role === 'patient' && (!age || !gender)) {
            return res.status(400).json({ message: 'Age and gender are required for patients' })
        }
        if (role === 'doctor' && !specialization) {
            return res.status(400).json({ message: 'Specialization is required for doctors' })
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create user
        const user = new User({
            email,
            password: hashedPassword,
            role,
            name
        })
        await user.save()

        // Create role-specific document
        if (role === 'admin') {
            const admin = new Admin({ userId: user._id, name: name || 'Admin' })
            await admin.save()
        } else if (role === 'doctor') {
            const doctor = new Doctor({
                userId: user._id,
                name,
                specialization: specialization || 'General Medicine'
            })
            await doctor.save()
            // Notify admin about new doctor signup
            notifyDoctorSignup(name, specialization || 'General Medicine')
        } else if (role === 'patient') {
            const patient = new Patient({
                userId: user._id,
                name,
                age: parseInt(age) || 0,
                gender: gender || 'other'
            })
            await patient.save()
            // Notify admin about new patient signup
            notifyPatientSignup(name)
        }

        const token = generateToken(user._id)

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name
            }
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body

        // Find user
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        const token = generateToken(user._id)

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name
            }
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

