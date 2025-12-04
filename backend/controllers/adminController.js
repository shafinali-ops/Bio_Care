const User = require('../models/user')
const Hospital = require('../models/hospital')
const Patient = require('../models/patient')
const Doctor = require('../models/doctor')
const Admin = require('../models/admin')
const bcrypt = require('bcryptjs')

exports.generateReport = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments()
        const totalPatients = await Patient.countDocuments()
        const totalDoctors = await Doctor.countDocuments()
        const totalHospitals = await Hospital.countDocuments()

        const report = {
            totalUsers,
            totalPatients,
            totalDoctors,
            totalHospitals,
            generatedAt: new Date()
        }

        res.json(report)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').populate('role')
        res.json(users)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.manageUser = async (req, res) => {
    try {
        const { userId } = req.params
        const { action } = req.body

        if (action === 'delete') {
            const user = await User.findById(userId)
            if (user) {
                // Delete role-specific document
                if (user.role === 'admin') {
                    await Admin.findOneAndDelete({ userId: user._id })
                } else if (user.role === 'doctor') {
                    await Doctor.findOneAndDelete({ userId: user._id })
                } else if (user.role === 'patient') {
                    await Patient.findOneAndDelete({ userId: user._id })
                }
                await User.findByIdAndDelete(userId)
            }
            res.json({ message: 'User deleted successfully' })
        } else if (action === 'update') {
            const user = await User.findByIdAndUpdate(userId, req.body, { new: true })
            res.json(user)
        } else {
            res.status(400).json({ message: 'Invalid action' })
        }
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

exports.getAllPatients = async (req, res) => {
    try {
        const patients = await Patient.find().populate('userId', 'email name')
        res.json(patients)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.getAllDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find().populate('userId', 'email name').populate('hospitalId')
        res.json(doctors)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Approve doctor
exports.approveDoctor = async (req, res) => {
    try {
        const { doctorId } = req.params
        const adminId = req.user._id

        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            {
                status: 'approved',
                approvedAt: new Date(),
                approvedBy: adminId
            },
            { new: true }
        ).populate('userId', 'email name')

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' })
        }

        // Create notification for doctor
        const Notification = require('../models/notification')
        const notification = new Notification({
            userId: doctor.userId._id,
            message: 'Your doctor account has been approved! You can now log in and start accepting appointments.'
        })
        await notification.save()

        res.json({ message: 'Doctor approved successfully', doctor })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Reject doctor
exports.rejectDoctor = async (req, res) => {
    try {
        const { doctorId } = req.params

        const doctor = await Doctor.findByIdAndUpdate(
            doctorId,
            { status: 'rejected' },
            { new: true }
        ).populate('userId', 'email name')

        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found' })
        }

        res.json({ message: 'Doctor rejected', doctor })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Block user account
exports.blockUser = async (req, res) => {
    try {
        const { userId } = req.params

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        // Block based on role
        if (user.role === 'doctor') {
            await Doctor.findOneAndUpdate(
                { userId: user._id },
                { status: 'blocked' }
            )
        }

        // Update user status
        user.isBlocked = true
        await user.save()

        res.json({ message: 'User blocked successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Unblock user account
exports.unblockUser = async (req, res) => {
    try {
        const { userId } = req.params

        const user = await User.findById(userId)
        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        if (user.role === 'doctor') {
            await Doctor.findOneAndUpdate(
                { userId: user._id },
                { status: 'approved' }
            )
        }

        user.isBlocked = false
        await user.save()

        res.json({ message: 'User unblocked successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get user statistics
exports.getUserStatistics = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments()
        const totalPatients = await Patient.countDocuments()
        const totalDoctors = await Doctor.countDocuments()
        const pendingDoctors = await Doctor.countDocuments({ status: 'pending' })
        const approvedDoctors = await Doctor.countDocuments({ status: 'approved' })
        const blockedUsers = await User.countDocuments({ isBlocked: true })
        const totalHospitals = await Hospital.countDocuments()

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const recentUsers = await User.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        })

        res.json({
            totalUsers,
            totalPatients,
            totalDoctors,
            pendingDoctors,
            approvedDoctors,
            blockedUsers,
            totalHospitals,
            recentUsers
        })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Get pending doctors for approval
exports.getPendingDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find({ status: 'pending' })
            .populate('userId', 'email name')
            .populate('hospitalId')
        res.json(doctors)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

exports.createUser = async (req, res) => {
    try {
        const { email, password, role, name, age, gender, specialization } = req.body

        // Check if user exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' })
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
        } else if (role === 'patient') {
            const patient = new Patient({ 
                userId: user._id, 
                name, 
                age: parseInt(age) || 0, 
                gender: gender || 'other' 
            })
            await patient.save()
        }

        res.status(201).json({
            message: 'User created successfully',
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
