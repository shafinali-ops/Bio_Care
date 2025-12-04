// linkDoctorsToHospitals.js
require('dotenv').config()
const mongoose = require('mongoose')
const Doctor = require('./models/doctor')
const Hospital = require('./models/hospital')

const mongoUri = process.env.MONGO_URI

async function linkDoctors() {
  try {
    if (!mongoUri) {
      console.error('MONGO_URI not set in .env')
      process.exit(1)
    }

    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    const hospitals = await Hospital.find({})
    const doctors = await Doctor.find({})

    console.log(`Found ${hospitals.length} hospitals and ${doctors.length} doctors`)

    if (hospitals.length === 0 || doctors.length === 0) {
      console.log('Nothing to link (no hospitals or no doctors)')
      process.exit(0)
    }

    // Clear existing links, so we start clean (optional, can skip if you already have links)
    await Doctor.updateMany({}, { $unset: { hospitalId: '' } })
    await Hospital.updateMany({}, { $set: { doctors: [] } })

    // Choose about 30% of doctors to be in hospitals
    const targetCount = Math.round(doctors.length * 0.3)
    console.log(`Linking about ${targetCount} doctors (~30%) to hospitals`)

    // Shuffle doctor list
    const shuffled = [...doctors].sort(() => Math.random() - 0.5)
    const selectedDoctors = shuffled.slice(0, targetCount)

    // Map hospitalId -> array of doctorIds to update Hospital.doctors in bulk
    const hospitalDoctorMap = new Map()

    for (const doctor of selectedDoctors) {
      // Pick a random hospital
      const randomHospital = hospitals[Math.floor(Math.random() * hospitals.length)]

      // Set doctor.hospitalId
      doctor.hospitalId = randomHospital._id
      await doctor.save()

      // Accumulate for hospital.doctors
      const key = randomHospital._id.toString()
      if (!hospitalDoctorMap.has(key)) {
        hospitalDoctorMap.set(key, [])
      }
      hospitalDoctorMap.get(key).push(doctor._id)
    }

    // Update Hospital.doctors arrays
    for (const [hospitalId, doctorIds] of hospitalDoctorMap.entries()) {
      await Hospital.findByIdAndUpdate(
        hospitalId,
        { $addToSet: { doctors: { $each: doctorIds } } }
      )
    }

    console.log(`✅ Linked ${selectedDoctors.length} doctors to hospitals`)
    console.log('ℹ️ Remaining doctors stay without hospitalId (remote / global doctors)')

    process.exit(0)
  } catch (err) {
    console.error('❌ Error linking doctors to hospitals:', err)
    process.exit(1)
  }
}

linkDoctors()