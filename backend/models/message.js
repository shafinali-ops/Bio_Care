const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: false // Not required if there's an attachment
    },
    read: {
        type: Boolean,
        default: false
    },
    conversationId: {
        type: String,
        required: true
    },
    // File attachment support
    attachment: {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        url: String,
        type: {
            type: String,
            enum: ['image', 'video', 'audio', 'document', 'other']
        }
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("Message", messageSchema)

