// seedSpecificHospitalDoctors.js
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./models/user')
const Doctor = require('./models/doctor')
const Hospital = require('./models/hospital')

const mongoUri = process.env.MONGO_URI

async function seedSpecificDoctors() {
  try {
    if (!mongoUri) {
      console.error('MONGO_URI not set in .env')
      process.exit(1)
    }

    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Find the two target hospitals
    const punjabCardiac = await Hospital.findOne({ name: 'Punjab Cardiac Center Rawalpindi' })
    const sightCare = await Hospital.findOne({ name: 'SightCare Eye Institute' })

    if (!punjabCardiac) {
      console.error('❌ Hospital not found: Punjab Cardiac Center Rawalpindi')
    }
    if (!sightCare) {
      console.error('❌ Hospital not found: SightCare Eye Institute')
    }
    if (!punjabCardiac && !sightCare) {
      process.exit(1)
    }

    const plainPassword = 'password123'
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    // Helper to create doctors for a given hospital
    async function createDoctorsForHospital(hospital, baseName, specialization, count) {
      if (!hospital) return

      console.log(`Creating up to ${count} ${specialization} doctors for ${hospital.name}...`)

      for (let i = 1; i <= count; i++) {
        const doctorName = `${baseName} ${i}`
        const safeHospitalSlug = hospital.name.toLowerCase().replace(/\s+/g, '')
        const email = `${safeHospitalSlug}.${specialization.toLowerCase()}.${i}@example.com`

        // Avoid duplicates if script re-run
        const existingUser = await User.findOne({ email })
        if (existingUser) {
          console.log(`Skipping existing user ${email}`)
          continue
        }

        const user = new User({
          email,
          password: hashedPassword,
          role: 'doctor',
          name: doctorName,
        })
        await user.save()

        const doctor = new Doctor({
          userId: user._id,
          name: doctorName,
          specialization,
          hospitalId: hospital._id,
          status: 'approved',
          approvedAt: new Date(),
        })
        await doctor.save()

        // Add to hospital.doctors
        await Hospital.findByIdAndUpdate(
          hospital._id,
          { $addToSet: { doctors: doctor._id } }
        )

        console.log(`✅ Created ${doctorName} (${specialization}) at ${hospital.name} -> ${email}`)
      }
    }

    // Up to 5 cardiology doctors for Punjab Cardiac Center Rawalpindi
    await createDoctorsForHospital(
      punjabCardiac,
      'Punjab Cardiac Cardiologist',
      'Cardiology',
      5
    )

    // Up to 5 ophthalmology/retina doctors for SightCare Eye Institute
    await createDoctorsForHospital(
      sightCare,
      'SightCare Eye Specialist',
      'Ophthalmology (Retina)',
      5
    )

    console.log('🎯 Done seeding specific hospital doctors')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error seeding specific doctors:', err)
    process.exit(1)
  }
}

seedSpecificDoctors()