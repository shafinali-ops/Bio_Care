const Call = require('../models/call')
const Notification = require('../models/notification')
const User = require('../models/user')
const { v4: uuidv4 } = require('uuid')

// Initiate a call
exports.initiateCall = async (req, res) => {
    try {
        const { receiverId, callType = 'video' } = req.body
        const callerId = req.user._id

        if (!receiverId) {
            return res.status(400).json({ message: 'Receiver ID is required' })
        }

        // End any existing active calls for this caller
        await Call.updateMany(
            { callerId: callerId.toString(), status: 'ringing' },
            { status: 'ended' }
        )

        // Create new call - ensure IDs are strings
        const call = new Call({
            callerId: callerId.toString(),
            receiverId: receiverId.toString(),
            status: 'ringing',
            callType,
            roomId: uuidv4()
        })
        await call.save()

        // Create notification for receiver
        const caller = await User.findById(callerId)
        if (caller) {
            const notification = new Notification({
                userId: receiverId.toString(),
                message: `${caller.name} is calling you`,
                type: 'call',
                callId: call._id
            })
            await notification.save()
        }

        // Populate caller info for response
        const populatedCall = await Call.findById(call._id)
            .populate('callerId', 'name email role')
            .populate('receiverId', 'name email role')

        res.status(201).json(populatedCall)
    } catch (error) {
        console.error('Error initiating call:', error)
        res.status(500).json({ message: error.message || 'Failed to initiate call' })
    }
}

// Check for incoming calls
exports.checkIncomingCalls = async (req, res) => {
    try {
        const receiverId = req.user._id

        // Find calls where this user is the receiver and status is ringing
        const incomingCall = await Call.findOne({
            receiverId: receiverId.toString(),
            status: 'ringing'
        })
            .populate('callerId', 'name email role')
            .sort({ createdAt: -1 })
            .limit(1)

        if (incomingCall) {
            res.json(incomingCall)
        } else {
            res.json(null)
        }
    } catch (error) {
        console.error('Error checking incoming calls:', error)
        res.status(500).json({ message: error.message })
    }
}

// Accept a call
exports.acceptCall = async (req, res) => {
    try {
        const { callId } = req.params
        const receiverId = req.user._id

        const call = await Call.findOneAndUpdate(
            { _id: callId, receiverId, status: 'ringing' },
            { status: 'accepted', startedAt: new Date() },
            { new: true }
        )
            .populate('callerId', 'name email role')
            .populate('receiverId', 'name email role')

        if (!call) {
            return res.status(404).json({ message: 'Call not found or already answered' })
        }

        res.json(call)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// Reject a call
exports.rejectCall = async (req, res) => {
    try {
        const { callId } = req.params
        const receiverId = req.user._id

        const call = await Call.findOneAndUpdate(
            { _id: callId, receiverId, status: 'ringing' },
            { status: 'rejected', endedAt: new Date() },
            { new: true }
        )

        if (!call) {
            return res.status(404).json({ message: 'Call not found' })
        }

        res.json(call)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

// End a call
exports.endCall = async (req, res) => {
    try {
        const { callId } = req.params
        const userId = req.user._id

        const call = await Call.findById(callId)
        if (!call) {
            return res.status(404).json({ message: 'Call not found' })
        }

        // Only caller or receiver can end the call
        const callerIdStr = call.callerId.toString()
        const receiverIdStr = call.receiverId.toString()
        const userIdStr = userId.toString()

        if (callerIdStr !== userIdStr && receiverIdStr !== userIdStr) {
            return res.status(403).json({ message: 'Unauthorized' })
        }

        // Calculate duration if call was started
        let duration = 0
        if (call.startedAt) {
            duration = Math.floor((new Date() - call.startedAt) / 1000)
        }

        call.status = 'ended'
        call.endedAt = new Date()
        if (duration > 0) {
            call.duration = duration
        }
        await call.save()

        res.json(call)
    } catch (error) {
        console.error('Error ending call:', error)
        res.status(500).json({ message: error.message })
    }
}

// Get call status
exports.getCallStatus = async (req, res) => {
    try {
        const { callId } = req.params
        const call = await Call.findById(callId)
            .populate('callerId', 'name email role')
            .populate('receiverId', 'name email role')

        if (!call) {
            return res.status(404).json({ message: 'Call not found' })
        }

        res.json(call)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

