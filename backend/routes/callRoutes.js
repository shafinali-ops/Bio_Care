const express = require('express')
const router = express.Router()
const callController = require('../controllers/callController')
const { authenticate } = require('../middleware/authMiddleware')

router.use(authenticate)

router.post('/initiate', callController.initiateCall)
router.get('/incoming', callController.checkIncomingCalls)
router.put('/:callId/accept', callController.acceptCall)
router.put('/:callId/reject', callController.rejectCall)
router.put('/:callId/end', callController.endCall)
router.get('/:callId/status', callController.getCallStatus)

module.exports = router

