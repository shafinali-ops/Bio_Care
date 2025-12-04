const mongoose = require('mongoose')
require('dotenv').config()

const Medication = require('../models/medication')

const medications = [
    // Pain Relief
    { name: 'Paracetamol 500mg', dosage: '500mg', frequency: 'Every 6-8 hours', category: 'Pain Relief', price: 5.99, description: 'Effective pain reliever and fever reducer', stock: 100 },
    { name: 'Ibuprofen 400mg', dosage: '400mg', frequency: 'Every 8 hours', category: 'Pain Relief', price: 7.99, description: 'Anti-inflammatory pain reliever', stock: 150 },
    { name: 'Aspirin 325mg', dosage: '325mg', frequency: 'Every 4-6 hours', category: 'Pain Relief', price: 4.99, description: 'Pain reliever and blood thinner', stock: 120 },
    { name: 'Naproxen 250mg', dosage: '250mg', frequency: 'Every 12 hours', category: 'Pain Relief', price: 8.99, description: 'Long-lasting pain relief', stock: 80 },
    { name: 'Acetaminophen 650mg', dosage: '650mg', frequency: 'Every 6 hours', category: 'Pain Relief', price: 6.99, description: 'Extra strength pain relief', stock: 90 },

    // Cold & Flu
    { name: 'Dextromethorphan Syrup', dosage: '15ml', frequency: 'Every 4-6 hours', category: 'Cold & Flu', price: 8.99, description: 'Cough suppressant', stock: 75 },
    { name: 'Guaifenesin 400mg', dosage: '400mg', frequency: 'Every 4 hours', category: 'Cold & Flu', price: 6.99, description: 'Expectorant for chest congestion', stock: 85 },
    { name: 'Pseudoephedrine 30mg', dosage: '30mg', frequency: 'Every 6 hours', category: 'Cold & Flu', price: 9.99, description: 'Nasal decongestant', stock: 70 },
    { name: 'Chlorpheniramine 4mg', dosage: '4mg', frequency: 'Every 6 hours', category: 'Cold & Flu', price: 5.99, description: 'Antihistamine for allergies', stock: 100 },
    { name: 'Loratadine 10mg', dosage: '10mg', frequency: 'Once daily', category: 'Cold & Flu', price: 7.99, description: 'Non-drowsy antihistamine', stock: 95 },

    // Digestive Health
    { name: 'Omeprazole 20mg', dosage: '20mg', frequency: 'Once daily', category: 'Digestive Health', price: 12.99, description: 'Acid reducer for heartburn', stock: 60 },
    { name: 'Ranitidine 150mg', dosage: '150mg', frequency: 'Twice daily', category: 'Digestive Health', price: 9.99, description: 'H2 blocker for acid reflux', stock: 70 },
    { name: 'Loperamide 2mg', dosage: '2mg', frequency: 'As needed', category: 'Digestive Health', price: 6.99, description: 'Anti-diarrheal medication', stock: 80 },
    { name: 'Bismuth Subsalicylate', dosage: '262mg', frequency: 'Every 30-60 minutes', category: 'Digestive Health', price: 8.99, description: 'Upset stomach relief', stock: 75 },
    { name: 'Simethicone 125mg', dosage: '125mg', frequency: 'After meals', category: 'Digestive Health', price: 5.99, description: 'Gas relief', stock: 90 },

    // Heart & Blood Pressure
    { name: 'Amlodipine 5mg', dosage: '5mg', frequency: 'Once daily', category: 'Heart & Blood Pressure', price: 15.99, description: 'Calcium channel blocker', stock: 50 },
    { name: 'Lisinopril 10mg', dosage: '10mg', frequency: 'Once daily', category: 'Heart & Blood Pressure', price: 14.99, description: 'ACE inhibitor for blood pressure', stock: 55 },
    { name: 'Metoprolol 25mg', dosage: '25mg', frequency: 'Twice daily', category: 'Heart & Blood Pressure', price: 13.99, description: 'Beta blocker', stock: 60 },
    { name: 'Atorvastatin 20mg', dosage: '20mg', frequency: 'Once daily', category: 'Heart & Blood Pressure', price: 18.99, description: 'Cholesterol lowering medication', stock: 45 },
    { name: 'Aspirin 81mg', dosage: '81mg', frequency: 'Once daily', category: 'Heart & Blood Pressure', price: 4.99, description: 'Low-dose aspirin for heart health', stock: 110 },

    // Antibiotics
    { name: 'Amoxicillin 500mg', dosage: '500mg', frequency: 'Three times daily', category: 'Antibiotics', price: 22.99, description: 'Broad-spectrum antibiotic', stock: 40 },
    { name: 'Azithromycin 250mg', dosage: '250mg', frequency: 'Once daily', category: 'Antibiotics', price: 24.99, description: 'Macrolide antibiotic', stock: 35 },
    { name: 'Ciprofloxacin 500mg', dosage: '500mg', frequency: 'Twice daily', category: 'Antibiotics', price: 26.99, description: 'Fluoroquinolone antibiotic', stock: 30 },
    { name: 'Doxycycline 100mg', dosage: '100mg', frequency: 'Twice daily', category: 'Antibiotics', price: 20.99, description: 'Tetracycline antibiotic', stock: 38 },
    { name: 'Cephalexin 500mg', dosage: '500mg', frequency: 'Four times daily', category: 'Antibiotics', price: 19.99, description: 'Cephalosporin antibiotic', stock: 42 },

    // Skin Care
    { name: 'Hydrocortisone Cream 1%', dosage: '1%', frequency: 'Apply 2-3 times daily', category: 'Skin Care', price: 7.99, description: 'Topical steroid for skin inflammation', stock: 85 },
    { name: 'Clotrimazole Cream', dosage: '1%', frequency: 'Apply twice daily', category: 'Skin Care', price: 8.99, description: 'Antifungal cream', stock: 80 },
    { name: 'Benzoyl Peroxide 5%', dosage: '5%', frequency: 'Apply once daily', category: 'Skin Care', price: 9.99, description: 'Acne treatment', stock: 75 },
    { name: 'Salicylic Acid 2%', dosage: '2%', frequency: 'Apply as needed', category: 'Skin Care', price: 6.99, description: 'Exfoliating treatment', stock: 90 },
    { name: 'Calamine Lotion', dosage: 'N/A', frequency: 'Apply as needed', category: 'Skin Care', price: 5.99, description: 'Itch relief lotion', stock: 95 },

    // Vitamins & Supplements
    { name: 'Vitamin D3 1000IU', dosage: '1000IU', frequency: 'Once daily', category: 'Vitamins & Supplements', price: 11.99, description: 'Bone health and immune support', stock: 100 },
    { name: 'Vitamin C 1000mg', dosage: '1000mg', frequency: 'Once daily', category: 'Vitamins & Supplements', price: 9.99, description: 'Immune system support', stock: 120 },
    { name: 'Multivitamin Complete', dosage: '1 tablet', frequency: 'Once daily', category: 'Vitamins & Supplements', price: 14.99, description: 'Complete daily nutrition', stock: 90 },
    { name: 'Omega-3 Fish Oil', dosage: '1000mg', frequency: 'Once daily', category: 'Vitamins & Supplements', price: 16.99, description: 'Heart and brain health', stock: 70 },
    { name: 'Calcium 600mg', dosage: '600mg', frequency: 'Twice daily', category: 'Vitamins & Supplements', price: 8.99, description: 'Bone strength support', stock: 85 },

    // Eye Care
    { name: 'Artificial Tears', dosage: '1-2 drops', frequency: 'As needed', category: 'Eye Care', price: 6.99, description: 'Lubricating eye drops', stock: 100 },
    { name: 'Antihistamine Eye Drops', dosage: '1-2 drops', frequency: 'Twice daily', category: 'Eye Care', price: 9.99, description: 'Allergy eye relief', stock: 80 },
    { name: 'Antibiotic Eye Drops', dosage: '1-2 drops', frequency: 'Four times daily', category: 'Eye Care', price: 12.99, description: 'Bacterial eye infection treatment', stock: 60 },
    { name: 'Eye Wash Solution', dosage: 'As needed', frequency: 'As needed', category: 'Eye Care', price: 7.99, description: 'Eye irrigation solution', stock: 75 },
    { name: 'Lubricating Eye Gel', dosage: '1 drop', frequency: 'At bedtime', category: 'Eye Care', price: 10.99, description: 'Overnight eye lubrication', stock: 70 },

    // Mental Health
    { name: 'Sertraline 50mg', dosage: '50mg', frequency: 'Once daily', category: 'Mental Health', price: 19.99, description: 'SSRI antidepressant', stock: 40 },
    { name: 'Fluoxetine 20mg', dosage: '20mg', frequency: 'Once daily', category: 'Mental Health', price: 18.99, description: 'SSRI for depression and anxiety', stock: 45 },
    { name: 'Lorazepam 1mg', dosage: '1mg', frequency: 'As needed', category: 'Mental Health', price: 22.99, description: 'Anxiety relief medication', stock: 35 },
    { name: 'Trazodone 50mg', dosage: '50mg', frequency: 'At bedtime', category: 'Mental Health', price: 17.99, description: 'Sleep aid and antidepressant', stock: 50 },
    { name: 'Buspirone 10mg', dosage: '10mg', frequency: 'Twice daily', category: 'Mental Health', price: 20.99, description: 'Anxiety medication', stock: 42 },

    // Diabetes
    { name: 'Metformin 500mg', dosage: '500mg', frequency: 'Twice daily', category: 'Diabetes', price: 12.99, description: 'Type 2 diabetes medication', stock: 55 },
    { name: 'Glipizide 5mg', dosage: '5mg', frequency: 'Before meals', category: 'Diabetes', price: 14.99, description: 'Blood sugar control', stock: 50 },
    { name: 'Insulin Syringes', dosage: 'N/A', frequency: 'As prescribed', category: 'Diabetes', price: 8.99, description: 'Disposable insulin syringes', stock: 100 },
    { name: 'Blood Glucose Test Strips', dosage: 'N/A', frequency: 'As needed', category: 'Diabetes', price: 24.99, description: '50 count test strips', stock: 60 },
    { name: 'Glucose Tablets', dosage: '4g', frequency: 'As needed', category: 'Diabetes', price: 5.99, description: 'Fast-acting glucose for low blood sugar', stock: 90 }
]

async function seedMedications() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/healthcare'
        
        await mongoose.connect(mongoUri)
        console.log('✅ Connected to MongoDB')

        // Clear existing medications (optional)
        console.log('🗑️  Clearing existing medications...')
        await Medication.deleteMany({})
        console.log('✅ Existing medications cleared')

        // Insert medications
        console.log('💊 Creating medications...')
        await Medication.insertMany(medications)
        console.log(`✅ Created ${medications.length} medications successfully!`)

        process.exit(0)
    } catch (error) {
        console.error('❌ Error seeding medications:', error)
        process.exit(1)
    }
}

seedMedications()







