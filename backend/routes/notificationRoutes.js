const express = require('express')
const router = express.Router()
const notificationController = require('../controllers/notificationController')
const { authenticate } = require('../middleware/authMiddleware')

router.use(authenticate)

router.get('/', notificationController.getNotifications)
router.get('/admin', notificationController.getAdminNotifications)
router.post('/', notificationController.createNotification)
router.put('/:id/read', notificationController.markAsRead)
router.put('/admin/read-all', notificationController.markAllAdminAsRead)

module.exports = router
