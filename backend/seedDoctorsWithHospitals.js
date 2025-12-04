// seedDoctorsWithHospitals.js
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./models/user')
const Doctor = require('./models/doctor')
const Hospital = require('./models/hospital')

const mongoUri = process.env.MONGO_URI

// Some sample specializations to spread across hospitals
const SPECIALIZATIONS = [
  'Cardiology',
  'Ophthalmology',
  'General Medicine',
  'Pediatrics',
  'Orthopedics',
  'Neurology',
  'Dermatology',
  'Psychiatry',
  'Gynecology',
  'ENT',
]

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function seedDoctors() {
  try {
    if (!mongoUri) {
      console.error('MONGO_URI not set in .env')
      process.exit(1)
    }

    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    const hospitals = await Hospital.find({})
    if (hospitals.length === 0) {
      console.error('❌ No hospitals found. Run seedHospitals.js first.')
      process.exit(1)
    }

    // Create 60 new doctor USERS + DOCTOR docs
    const numberOfDoctorsToCreate = 60
    console.log(`Creating ${numberOfDoctorsToCreate} new doctors and assigning them to hospitals...`)

    const plainPassword = 'password123'
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    const newDoctorIds = []

    for (let i = 1; i <= numberOfDoctorsToCreate; i++) {
      const doctorName = `Doctor ${i}`
      const email = `doctor${i}@example.com`

      // Avoid duplicate emails if script rerun
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        console.log(`Skipping existing user ${email}`)
        continue
      }

      // Create User
      const user = new User({
        email,
        password: hashedPassword,
        role: 'doctor',
        name: doctorName,
      })
      await user.save()

      // Assign specialization and random hospital
      const specialization = randomItem(SPECIALIZATIONS)
      const hospital = randomItem(hospitals)

      const doctor = new Doctor({
        userId: user._id,
        name: doctorName,
        specialization,
        hospitalId: hospital._id,
        status: 'approved', // make them usable immediately
        approvedAt: new Date(),
      })
      await doctor.save()

      newDoctorIds.push(doctor._id)
      console.log(`Created doctor ${doctorName} -> ${email} (${specialization}) at hospital ${hospital.name}`)
    }

    // Add these doctors into Hospital.doctors arrays
    const doctors = await Doctor.find({ _id: { $in: newDoctorIds } })

    // Build map hospitalId -> doctorIds
    const hospitalDoctorMap = new Map()
    doctors.forEach((doc) => {
      if (!doc.hospitalId) return
      const key = doc.hospitalId.toString()
      if (!hospitalDoctorMap.has(key)) {
        hospitalDoctorMap.set(key, [])
      }
      hospitalDoctorMap.get(key).push(doc._id)
    })

    for (const [hospitalId, doctorIds] of hospitalDoctorMap.entries()) {
      await Hospital.findByIdAndUpdate(
        hospitalId,
        { $addToSet: { doctors: { $each: doctorIds } } }
      )
    }

    console.log(`✅ Created and linked ${newDoctorIds.length} new doctors to hospitals`)
    console.log('ℹ️ Login email pattern: doctor1@example.com ... doctor60@example.com, password: password123')

    process.exit(0)
  } catch (err) {
    console.error('❌ Error seeding doctors with hospitals:', err)
    process.exit(1)
  }
}

seedDoctors()