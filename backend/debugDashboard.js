const mongoose = require('mongoose');
require('dotenv').config();

const Patient = require('./models/patient');
const Appointment = require('./models/appointment');
const Consultation = require('./models/consultation');
const Prescription = require('./models/prescription');
const User = require('./models/user');

const MONGO_URI = process.env.MONGO_URI;

async function debugDashboard() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // Step 1: Find all users with role 'patient'
        console.log('=== STEP 1: Finding Patient Users ===');
        const patientUsers = await User.find({ role: 'patient' });
        console.log(`Found ${patientUsers.length} patient users`);

        if (patientUsers.length === 0) {
            console.log('❌ No patient users found!');
            return;
        }

        // Show first 3 patient users
        console.log('\nFirst 3 patient users:');
        patientUsers.slice(0, 3).forEach((user, idx) => {
            console.log(`${idx + 1}. User ID: ${user._id}, Email: ${user.email}`);
        });

        // Step 2: For each patient user, find their Patient profile
        console.log('\n=== STEP 2: Finding Patient Profiles ===');
        for (let i = 0; i < Math.min(3, patientUsers.length); i++) {
            const user = patientUsers[i];
            console.log(`\n--- Checking user: ${user.email} (${user._id}) ---`);

            const patientProfile = await Patient.findOne({ userId: user._id });

            if (!patientProfile) {
                console.log(`❌ No Patient profile found for user ${user.email}`);
                continue;
            }

            console.log(`✅ Patient Profile found:`);
            console.log(`   Patient ID: ${patientProfile._id}`);
            console.log(`   Name: ${patientProfile.name}`);
            console.log(`   Age: ${patientProfile.age}`);
            console.log(`   Gender: ${patientProfile.gender}`);

            // Step 3: Count appointments for this patient
            console.log('\n   === Appointments ===');
            const appointments = await Appointment.find({ patientId: patientProfile._id });
            console.log(`   Total Appointments: ${appointments.length}`);

            if (appointments.length > 0) {
                console.log(`   Sample appointment:`);
                const apt = appointments[0];
                console.log(`     - ID: ${apt._id}`);
                console.log(`     - Date: ${apt.date}`);
                console.log(`     - Status: ${apt.status}`);
                console.log(`     - Doctor ID: ${apt.doctorId}`);
            }

            // Step 4: Count consultations for this patient
            console.log('\n   === Consultations ===');
            const consultations = await Consultation.find({ patientId: patientProfile._id });
            console.log(`   Total Consultations: ${consultations.length}`);

            if (consultations.length > 0) {
                console.log(`   Sample consultation:`);
                const cons = consultations[0];
                console.log(`     - ID: ${cons._id}`);
                console.log(`     - Status: ${cons.consultation_status}`);
                console.log(`     - Date: ${cons.consultation_date}`);
                console.log(`     - Doctor ID: ${cons.doctorId}`);
            }

            // Step 5: Count prescriptions for this patient
            console.log('\n   === Prescriptions ===');
            const prescriptions = await Prescription.find({ patientId: patientProfile._id });
            console.log(`   Total Prescriptions: ${prescriptions.length}`);

            if (prescriptions.length > 0) {
                console.log(`   Sample prescription:`);
                const pres = prescriptions[0];
                console.log(`     - ID: ${pres._id}`);
                console.log(`     - Date: ${pres.prescription_date}`);
                console.log(`     - Medicines: ${pres.medicines ? pres.medicines.length : 0}`);
            }

            // Step 6: Simulate getDashboardStats logic
            console.log('\n   === Dashboard Stats Simulation ===');
            console.log(`   {`);
            console.log(`     profile: {`);
            console.log(`       name: "${patientProfile.name}",`);
            console.log(`       age: ${patientProfile.age},`);
            console.log(`       email: "${user.email}",`);
            console.log(`       patientId: "${patientProfile._id}"`);
            console.log(`     },`);
            console.log(`     stats: {`);
            console.log(`       totalAppointments: ${appointments.length},`);
            console.log(`       totalConsultations: ${consultations.length},`);
            console.log(`       totalPrescriptions: ${prescriptions.length}`);
            console.log(`     }`);
            console.log(`   }`);
        }

        // Step 7: Check if there are orphaned records
        console.log('\n\n=== STEP 3: Checking for Orphaned Records ===');

        const allAppointments = await Appointment.countDocuments();
        const allConsultations = await Consultation.countDocuments();
        const allPrescriptions = await Prescription.countDocuments();

        console.log(`Total Appointments in DB: ${allAppointments}`);
        console.log(`Total Consultations in DB: ${allConsultations}`);
        console.log(`Total Prescriptions in DB: ${allPrescriptions}`);

        // Check for appointments with invalid patientId
        if (allAppointments > 0) {
            const sampleApt = await Appointment.findOne();
            console.log(`\nSample Appointment patientId: ${sampleApt.patientId}`);

            const patientExists = await Patient.findById(sampleApt.patientId);
            if (!patientExists) {
                console.log(`❌ WARNING: Appointment references non-existent Patient ID!`);
            } else {
                console.log(`✅ Appointment correctly references Patient: ${patientExists.name}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
        console.error(error.stack);
    } finally {
        await mongoose.disconnect();
        console.log('\n\nDisconnected from MongoDB');
    }
}

debugDashboard();
