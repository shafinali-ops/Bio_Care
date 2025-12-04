const express = require('express')
const router = express.Router()
const adminController = require('../controllers/adminController')
const { authenticate, authorize } = require('../middleware/authMiddleware')

router.use(authenticate)
router.use(authorize('admin'))

router.get('/reports', adminController.generateReport)
router.get('/users', adminController.getAllUsers)
router.post('/users', adminController.createUser)
router.put('/users/:userId', adminController.manageUser)
router.get('/hospitals', adminController.getAllHospitals)
router.get('/patients', adminController.getAllPatients)
router.get('/doctors', adminController.getAllDoctors)
router.get('/doctors/pending', adminController.getPendingDoctors)
router.put('/doctors/:doctorId/approve', adminController.approveDoctor)
router.put('/doctors/:doctorId/reject', adminController.rejectDoctor)
router.put('/users/:userId/block', adminController.blockUser)
router.put('/users/:userId/unblock', adminController.unblockUser)
router.get('/statistics', adminController.getUserStatistics)

module.exports = router

