const jwt = require('jsonwebtoken')
const User = require('../models/user')

exports.authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1]

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
        const user = await User.findById(decoded.userId)

        if (!user) {
            return res.status(401).json({ message: 'User not found' })
        }

        // Check if user is blocked
        if (user.isBlocked) {
            return res.status(403).json({ message: 'Your account has been blocked' })
        }

        req.user = user
        next()
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' })
    }
}

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' })
        }

        // Handle array of roles
        const roleArray = roles.length === 1 && Array.isArray(roles[0]) ? roles[0] : roles
        
        if (!roleArray.includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' })
        }

        // Check if user is blocked
        if (req.user.isBlocked) {
            return res.status(403).json({ message: 'Your account has been blocked' })
        }

        next()
    }
}

