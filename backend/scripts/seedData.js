const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const User = require('../models/user')
const Admin = require('../models/admin')
const Doctor = require('../models/doctor')
const Patient = require('../models/patient')

// Sample data
const patients = [
    { name: 'John Doe', email: 'john.doe@example.com', age: 35, gender: 'male' },
    { name: 'Jane Smith', email: 'jane.smith@example.com', age: 28, gender: 'female' },
    { name: 'Michael Johnson', email: 'michael.j@example.com', age: 42, gender: 'male' },
    { name: 'Emily Davis', email: 'emily.davis@example.com', age: 31, gender: 'female' },
    { name: 'Robert Wilson', email: 'robert.w@example.com', age: 55, gender: 'male' },
    { name: 'Sarah Brown', email: 'sarah.brown@example.com', age: 29, gender: 'female' },
    { name: 'David Martinez', email: 'david.m@example.com', age: 38, gender: 'male' },
    { name: 'Lisa Anderson', email: 'lisa.a@example.com', age: 33, gender: 'female' },
    { name: 'James Taylor', email: 'james.t@example.com', age: 47, gender: 'male' },
    { name: 'Maria Garcia', email: 'maria.g@example.com', age: 26, gender: 'female' },
]

const doctors = [
    { name: 'Dr. Sarah Williams', email: 'sarah.williams@example.com', specialization: 'Cardiology' },
    { name: 'Dr. Mark Thompson', email: 'mark.thompson@example.com', specialization: 'Pediatrics' },
    { name: 'Dr. Jennifer Lee', email: 'jennifer.lee@example.com', specialization: 'Dermatology' },
    { name: 'Dr. Christopher Brown', email: 'chris.brown@example.com', specialization: 'Orthopedics' },
    { name: 'Dr. Amanda White', email: 'amanda.white@example.com', specialization: 'Neurology' },
]

const admin = {
    name: 'Admin User',
    email: 'admin@healthcare.com',
    password: 'admin123'
}

async function seedDatabase() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/healthcare'
        
        if (!process.env.MONGO_URI) {
            console.log('⚠️  MONGO_URI not set in .env, using default: mongodb://localhost:27017/healthcare')
        } else {
            console.log('📡 Connecting to MongoDB...')
        }
        
        await mongoose.connect(mongoUri)
        console.log('✅ Connected to MongoDB successfully')

        // Clear existing data (optional - comment out if you want to keep existing data)
        console.log('🗑️  Clearing existing data...')
        await User.deleteMany({})
        await Admin.deleteMany({})
        await Doctor.deleteMany({})
        await Patient.deleteMany({})
        console.log('✅ Existing data cleared')

        // Create Admin
        console.log('👤 Creating admin user...')
        const hashedAdminPassword = await bcrypt.hash(admin.password, 10)
        const adminUser = new User({
            email: admin.email,
            password: hashedAdminPassword,
            role: 'admin',
            name: admin.name
        })
        await adminUser.save()

        const adminDoc = new Admin({
            userId: adminUser._id,
            name: admin.name
        })
        await adminDoc.save()
        console.log(`✅ Admin created: ${admin.email} / ${admin.password}`)

        // Create Patients
        console.log('👥 Creating patients...')
        for (const patientData of patients) {
            const hashedPassword = await bcrypt.hash('patient123', 10)
            
            const user = new User({
                email: patientData.email,
                password: hashedPassword,
                role: 'patient',
                name: patientData.name
            })
            await user.save()

            const patient = new Patient({
                userId: user._id,
                name: patientData.name,
                age: patientData.age,
                gender: patientData.gender
            })
            await patient.save()
            
            console.log(`✅ Patient created: ${patientData.email} / patient123`)
        }

        // Create Doctors
        console.log('👨‍⚕️ Creating doctors...')
        for (const doctorData of doctors) {
            const hashedPassword = await bcrypt.hash('doctor123', 10)
            
            const user = new User({
                email: doctorData.email,
                password: hashedPassword,
                role: 'doctor',
                name: doctorData.name
            })
            await user.save()

            const doctor = new Doctor({
                userId: user._id,
                name: doctorData.name,
                specialization: doctorData.specialization
            })
            await doctor.save()
            
            console.log(`✅ Doctor created: ${doctorData.email} / doctor123`)
        }

        console.log('\n🎉 Seed data created successfully!')
        console.log('\n📋 Login Credentials:')
        console.log('Admin: admin@healthcare.com / admin123')
        console.log('Patients: [email] / patient123')
        console.log('Doctors: [email] / doctor123')
        console.log('\n')

        process.exit(0)
    } catch (error) {
        console.error('❌ Error seeding database:', error)
        process.exit(1)
    }
}

seedDatabase()

