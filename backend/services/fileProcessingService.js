const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');

// Extract text from PDF
const extractTextFromPDF = async (filePath) => {
    try {
        console.log('Starting PDF extraction for:', filePath);
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        console.log('PDF extraction successful, length:', data.text.length);
        return data.text;
    } catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error('Failed to extract text from PDF: ' + error.message);
    }
};

// Extract text from DOCX
const extractTextFromDOCX = async (filePath) => {
    try {
        console.log('Starting DOCX extraction for:', filePath);
        const result = await mammoth.extractRawText({ path: filePath });
        console.log('DOCX extraction successful');
        return result.value;
    } catch (error) {
        console.error('Error extracting text from DOCX:', error);
        throw new Error('Failed to extract text from DOCX: ' + error.message);
    }
};

// Extract text from image using Tesseract OCR
const extractTextFromImage = async (filePath) => {
    try {
        console.log('Starting OCR for:', filePath);
        const { data: { text } } = await Tesseract.recognize(
            filePath,
            'eng', // Start with English only to test stability
            {
                logger: m => console.log('Tesseract:', m)
            }
        );
        console.log('OCR successful, text length:', text.length);
        return text;
    } catch (error) {
        console.error('Error extracting text from image:', error);
        throw new Error('Failed to extract text from image: ' + error.message);
    }
};

// Main function to process any file type
const processFile = async (filePath, fileType) => {
    const ext = path.extname(filePath).toLowerCase();
    console.log('Processing file type:', ext, 'Mime:', fileType);

    try {
        switch (ext) {
            case '.pdf':
                return await extractTextFromPDF(filePath);

            case '.docx':
            case '.doc':
                return await extractTextFromDOCX(filePath);

            case '.jpg':
            case '.jpeg':
            case '.png':
            case '.gif':
            case '.bmp':
            case '.tiff':
                return await extractTextFromImage(filePath);

            default:
                throw new Error(`Unsupported file type: ${ext}`);
        }
    } catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
};

// Clean up extracted text
const cleanExtractedText = (text) => {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
        .trim();
};

module.exports = {
    extractTextFromPDF,
    extractTextFromDOCX,
    extractTextFromImage,
    processFile,
    cleanExtractedText
};
