const express = require('express')
const router = express.Router()
const messageController = require('../controllers/messageController')
const { authenticate } = require('../middleware/authMiddleware')
const { upload } = require('../middleware/uploadMiddleware')

router.use(authenticate)

router.get('/conversations', messageController.getConversations)
router.get('/conversation/:userId', messageController.getConversation)
router.post('/send', upload.single('file'), messageController.sendMessage)
router.put('/read/:userId', messageController.markAsRead)

module.exports = router

