const mongoose = require('mongoose');
const Patient = require('./models/patient');
const Appointment = require('./models/appointment');
const Prescription = require('./models/prescription');
const User = require('./models/user');
// Register other models to avoid MissingSchemaError
require('./models/medicalRecord');
require('./models/healthRecord');
require('./models/doctor');

const MONGO_URI = 'mongodb+srv://test:test@cluster0.5ucko7p.mongodb.net/healthcare?appName=Cluster0';

async function verifyData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const patients = await Patient.find().populate('userId');
        console.log(`Found ${patients.length} patients.`);

        let count = 0;
        for (const patient of patients) {
            if (count >= 3) break;
            console.log(`\n--------------------------------------------------`);
            console.log(`Patient: ${patient.name} (ID: ${patient._id})`);
            console.log(`User Email: ${patient.userId ? patient.userId.email : 'N/A'}`);

            const appointments = await Appointment.find({ patientId: patient._id });
            const consultations = await Appointment.find({ patientId: patient._id, status: 'completed' });
            const prescriptions = await Prescription.find({ patientId: patient._id });

            console.log(`Total Appointments: ${appointments.length}`);
            console.log(`Total Consultations: ${consultations.length}`);
            console.log(`Total Prescriptions: ${prescriptions.length}`);

            console.log(JSON.stringify({
                profile: {
                    name: patient.name,
                    age: patient.age,
                    email: patient.userId ? patient.userId.email : 'N/A',
                },
                stats: {
                    totalAppointments: appointments.length,
                    totalConsultations: consultations.length,
                    totalPrescriptions: prescriptions.length
                }
            }, null, 2));
            count++;
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

verifyData();
