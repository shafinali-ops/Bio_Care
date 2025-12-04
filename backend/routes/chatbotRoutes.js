const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const { authenticate } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/chatbot');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Accept PDFs, DOCs, and images
    const allowedTypes = /pdf|doc|docx|jpg|jpeg|png|gif|bmp|tiff/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only PDF, DOC, DOCX, and image files are allowed!'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

// Configure multer for audio uploads
const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const audioDir = path.join(__dirname, '../uploads/audio');
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }
        cb(null, audioDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const audioUpload = multer({
    storage: audioStorage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for audio
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp3|wav|m4a|webm|ogg/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed!'));
        }
    }
});

router.use(authenticate);

// New AI chatbot endpoints
router.post('/message', chatbotController.sendMessage);
router.post('/upload-file', upload.single('file'), chatbotController.uploadFile);
router.post('/transcribe-voice', audioUpload.single('audio'), chatbotController.transcribeVoice);
router.post('/text-to-speech', chatbotController.textToSpeech);
router.get('/history/:sessionId', chatbotController.getChatHistory);
router.get('/sessions', chatbotController.getSessions);

// Legacy endpoints (backward compatibility)
router.post('/query', chatbotController.sendQuery);
router.post('/health-tips', chatbotController.getHealthTips);
router.post('/recommend-medication', chatbotController.recommendMedication);

module.exports = router;
