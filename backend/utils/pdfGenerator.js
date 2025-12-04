const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

exports.generatePrescriptionPDF = async (prescription) => {
    return new Promise((resolve, reject) => {
        try {
            // Create a document
            const doc = new PDFDocument({ margin: 50 });

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(__dirname, '../uploads/prescriptions');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const fileName = `prescription_${prescription._id}.pdf`;
            const filePath = path.join(uploadsDir, fileName);

            // Pipe to file
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Header
            doc.fontSize(24)
                .fillColor('#6B46C1')
                .text('MEDICAL PRESCRIPTION', { align: 'center' })
                .moveDown();

            // Prescription Date
            doc.fontSize(10)
                .fillColor('#666666')
                .text(`Date: ${new Date(prescription.prescription_date).toLocaleDateString()}`, { align: 'right' })
                .moveDown(2);

            // Doctor Information
            doc.fontSize(14)
                .fillColor('#000000')
                .text('Doctor Information', { underline: true })
                .moveDown(0.5);

            doc.fontSize(11)
                .fillColor('#333333')
                .text(`Dr. ${prescription.doctorId.name}`)
                .text(`Specialization: ${prescription.doctorId.specialization}`)
                .moveDown(1.5);

            // Patient Information
            doc.fontSize(14)
                .fillColor('#000000')
                .text('Patient Information', { underline: true })
                .moveDown(0.5);

            doc.fontSize(11)
                .fillColor('#333333')
                .text(`Name: ${prescription.patientId.name}`)
                .text(`Age: ${prescription.patientId.age} years`)
                .text(`Gender: ${prescription.patientId.gender}`)
                .moveDown(1.5);

            // Diagnosis
            doc.fontSize(14)
                .fillColor('#000000')
                .text('Diagnosis', { underline: true })
                .moveDown(0.5);

            doc.fontSize(11)
                .fillColor('#333333')
                .text(prescription.consultationId.diagnosis)
                .moveDown(1.5);

            // Medicines
            doc.fontSize(14)
                .fillColor('#000000')
                .text('Prescribed Medicines', { underline: true })
                .moveDown(0.5);

            prescription.medicines.forEach((medicine, index) => {
                doc.fontSize(12)
                    .fillColor('#6B46C1')
                    .text(`${index + 1}. ${medicine.medicine_name}`, { continued: false })
                    .fontSize(10)
                    .fillColor('#333333')
                    .text(`   Dosage: ${medicine.dosage}`)
                    .text(`   Frequency: ${medicine.frequency}`)
                    .text(`   Duration: ${medicine.duration}`);

                if (medicine.instructions) {
                    doc.text(`   Instructions: ${medicine.instructions}`);
                }
                doc.moveDown(0.5);
            });

            doc.moveDown(1);

            // Follow-up Date
            if (prescription.follow_up_date) {
                doc.fontSize(11)
                    .fillColor('#000000')
                    .text(`Follow-up Date: ${new Date(prescription.follow_up_date).toLocaleDateString()}`, { bold: true })
                    .moveDown(1);
            }

            // General Instructions
            if (prescription.instructions) {
                doc.fontSize(14)
                    .fillColor('#000000')
                    .text('General Instructions', { underline: true })
                    .moveDown(0.5);

                doc.fontSize(11)
                    .fillColor('#333333')
                    .text(prescription.instructions)
                    .moveDown(2);
            }

            // Footer
            doc.fontSize(8)
                .fillColor('#999999')
                .text('This is a computer-generated prescription.', { align: 'center' })
                .text('For any queries, please contact your doctor.', { align: 'center' });

            // Finalize PDF
            doc.end();

            stream.on('finish', () => {
                resolve({ fileName, filePath });
            });

            stream.on('error', (error) => {
                reject(error);
            });

        } catch (error) {
            reject(error);
        }
    });
};
