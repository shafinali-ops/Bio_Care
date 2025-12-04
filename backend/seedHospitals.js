// seedHospitals.js
require('dotenv').config()
const mongoose = require('mongoose')
const Hospital = require('./models/hospital')

const mongoUri = process.env.MONGO_URI

const hospitals = [
  // Heart / Cardiology (Rawalpindi)
  { name: 'Rawalpindi Heart Institute', location: 'Rawalpindi', specialization: ['cardiology', 'heart'] },
  { name: 'Punjab Cardiac Center Rawalpindi', location: 'Rawalpindi', specialization: ['cardiology'] },
  { name: 'City Heart Clinic Rawalpindi', location: 'Rawalpindi', specialization: ['cardiology', 'emergency'] },
  { name: 'Al-Shifa Heart & Vascular Clinic', location: 'Rawalpindi', specialization: ['cardiology'] },
  { name: 'Pakistan Cardiac Care Hospital', location: 'Rawalpindi', specialization: ['cardiology', 'ICU'] },
  { name: 'Metropolitan Heart Hospital', location: 'Rawalpindi', specialization: ['cardiology', 'surgery'] },
  { name: 'Capital Heart & Chest Center', location: 'Rawalpindi', specialization: ['cardiology', 'pulmonology'] },

  // Eye / Ophthalmology (Rawalpindi)
  { name: 'Rawalpindi Eye Care Center', location: 'Rawalpindi', specialization: ['ophthalmology', 'eye'] },
  { name: 'Vision Plus Eye Hospital', location: 'Rawalpindi', specialization: ['ophthalmology'] },
  { name: 'Al-Noor Eye Clinic Rawalpindi', location: 'Rawalpindi', specialization: ['ophthalmology'] },
  { name: 'City Eye & Laser Center', location: 'Rawalpindi', specialization: ['ophthalmology', 'laser'] },
  { name: 'SightCare Eye Institute', location: 'Rawalpindi', specialization: ['ophthalmology', 'retina'] },
  { name: 'Bright Vision Eye Hospital', location: 'Rawalpindi', specialization: ['ophthalmology', 'cornea'] },

  // General / other specialties (Rawalpindi)
  { name: 'Rawalpindi General Hospital', location: 'Rawalpindi', specialization: ['general', 'emergency', 'pediatrics'] },
  { name: 'Margalla Medical Complex', location: 'Rawalpindi', specialization: ['general', 'surgery'] },
  { name: 'City Health & Trauma Center', location: 'Rawalpindi', specialization: ['emergency', 'orthopedics'] },
  { name: 'Al-Shifa General Hospital', location: 'Rawalpindi', specialization: ['general', 'maternity'] },
  { name: 'Metro Care Hospital', location: 'Rawalpindi', specialization: ['general', 'cardiology', 'neurology'] },
  { name: 'SafeLife Medical Center', location: 'Rawalpindi', specialization: ['family medicine', 'general'] },
  { name: 'Premier Children & Women Hospital', location: 'Rawalpindi', specialization: ['pediatrics', 'gynecology'] },
]

async function seed() {
  try {
    if (!mongoUri) {
      console.error('MONGO_URI not set in .env')
      process.exit(1)
    }

    await mongoose.connect(mongoUri)
    console.log('✅ Connected to MongoDB')

    // Optional: clear existing hospitals first
    // await Hospital.deleteMany({})
    // console.log('🧹 Cleared existing hospitals')

    await Hospital.insertMany(hospitals)
    console.log(`✅ Inserted ${hospitals.length} hospitals`)

    process.exit(0)
  } catch (err) {
    console.error('❌ Error seeding hospitals:', err)
    process.exit(1)
  }
}

seed()