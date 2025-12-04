const Message = require('../models/message')
const User = require('../models/user')

// Get conversation between two users
exports.getConversation = async (req, res) => {
    try {
        const { userId } = req.params
        const currentUserId = req.user._id

        console.log('📥 GET CONVERSATION REQUEST:')
        console.log('  Current User ID:', currentUserId.toString())
        console.log('  Other User ID:', userId)

        const conversationId = [currentUserId.toString(), userId].sort().join('_')

        console.log('  Conversation ID:', conversationId)

        const messages = await Message.find({ conversationId })
            .populate('senderId', 'name email role')
            .populate('receiverId', 'name email role')
            .sort({ createdAt: 1 })

        console.log('  ✅ Found', messages.length, 'messages')

        res.json(messages)
    } catch (error) {
        console.error('❌ Error getting conversation:', error)
        res.status(500).json({ message: error.message })
    }
}

// Get all conversations for current user
exports.getConversations = async (req, res) => {
    try {
        const currentUserId = req.user._id

        const messages = await Message.find({
            $or: [
                { senderId: currentUserId },
                { receiverId: currentUserId }
            ]
        })
            .populate('senderId', 'name email role')
            .populate('receiverId', 'name email role')
            .sort({ createdAt: -1 })

        // Group by conversation
        const conversationsMap = new Map()
        messages.forEach(msg => {
            // Ensure we have populated users
            if (!msg.senderId || !msg.receiverId) return

            const senderIdStr = msg.senderId._id ? msg.senderId._id.toString() : String(msg.senderId)
            const receiverIdStr = msg.receiverId._id ? msg.receiverId._id.toString() : String(msg.receiverId)
            const currentUserIdStr = currentUserId.toString()

            const otherUserId = senderIdStr === currentUserIdStr
                ? receiverIdStr
                : senderIdStr

            const otherUser = senderIdStr === currentUserIdStr
                ? msg.receiverId
                : msg.senderId

            if (!conversationsMap.has(otherUserId)) {
                conversationsMap.set(otherUserId, {
                    userId: otherUserId,
                    user: otherUser,
                    lastMessage: msg,
                    unreadCount: 0
                })
            }

            const conv = conversationsMap.get(otherUserId)
            const msgDate = msg.createdAt || new Date(0)
            const convDate = conv.lastMessage.createdAt || new Date(0)
            if (msgDate > convDate) {
                conv.lastMessage = msg
            }
            if (!msg.read && receiverIdStr === currentUserIdStr) {
                conv.unreadCount++
            }
        })

        const conversations = Array.from(conversationsMap.values())
        res.json(conversations)
    } catch (error) {
        console.error('Error getting conversations:', error)
        res.status(500).json({ message: error.message })
    }
}

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, message } = req.body
        const senderId = req.user._id
        const file = req.file

        console.log('📨 SEND MESSAGE REQUEST:')
        console.log('  Sender ID (from auth):', senderId.toString())
        console.log('  Receiver ID (from body):', receiverId)
        console.log('  Message:', message)
        console.log('  File:', file ? file.filename : 'No file')

        if (!receiverId) {
            return res.status(400).json({ message: 'Receiver ID is required' })
        }

        // Either message or file must be present
        if (!message && !file) {
            return res.status(400).json({ message: 'Message content or file is required' })
        }

        // Ensure both IDs are strings for consistency
        const senderIdStr = senderId.toString()
        const receiverIdStr = receiverId.toString()

        const conversationId = [senderIdStr, receiverIdStr].sort().join('_')

        console.log('  Conversation ID:', conversationId)

        // Prepare message data
        const messageData = {
            senderId: senderIdStr,
            receiverId: receiverIdStr,
            conversationId
        }

        // Add text message if present
        if (message && message.trim()) {
            messageData.message = message.trim()
        }

        // Add file attachment if present
        if (file) {
            const { getFileType } = require('../middleware/uploadMiddleware')
            messageData.attachment = {
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                url: `/uploads/messages/${file.filename}`,
                type: getFileType(file.mimetype)
            }
            console.log('  Attachment type:', messageData.attachment.type)
        }

        const newMessage = new Message(messageData)
        await newMessage.save()

        console.log('  ✅ Message saved to database with ID:', newMessage._id)

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('senderId', 'name email role')
            .populate('receiverId', 'name email role')

        console.log('  ✅ Message populated and returned')

        res.status(201).json(populatedMessage)
    } catch (error) {
        console.error('❌ Error sending message:', error)
        res.status(500).json({ message: error.message || 'Failed to send message' })
    }
}

// Mark messages as read
exports.markAsRead = async (req, res) => {
    try {
        const { userId } = req.params
        const currentUserId = req.user._id

        const conversationId = [currentUserId.toString(), userId].sort().join('_')

        await Message.updateMany(
            {
                conversationId,
                receiverId: currentUserId,
                read: false
            },
            { read: true }
        )

        res.json({ message: 'Messages marked as read' })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
}

