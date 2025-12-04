const express = require('express'); // Server restart trigger

const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For FormData support
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Socket.IO Signaling
// Track online users: Map userId to socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send socket ID to the user
  socket.emit('me', socket.id);

  // Handle user join with userId
  socket.on('user-join', (data) => {
    const { userId, role, name } = data;
    onlineUsers.set(userId, {
      socketId: socket.id,
      role,
      name,
      userId
    });
    console.log(`✅ User joined: ${name} (${role})`);
    console.log(`   ID: ${userId}`);
    console.log(`   Socket: ${socket.id}`);
    console.log(`   Total Online: ${onlineUsers.size}`);

    // Broadcast online users list
    io.emit('online-users', Array.from(onlineUsers.values()));
  });

  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
    console.log(`User ${userId} joined room ${roomId}`);
  });

  socket.on('offer', (payload) => {
    io.to(payload.target).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    io.to(payload.target).emit('answer', payload);
  });

  socket.on('ice-candidate', (incoming) => {
    io.to(incoming.target).emit('ice-candidate', incoming.candidate);
  });

  socket.on('call-user', (data) => {
    console.log(`📞 Call initiated by ${data.callerName} (${data.callerId})`);
    console.log(`   Calling user ID: ${data.userToCall}`);

    const recipient = onlineUsers.get(data.userToCall);

    if (recipient) {
      console.log(`   ✅ Recipient found: ${recipient.name}`);
      console.log(`   Target Socket: ${recipient.socketId}`);

      io.to(recipient.socketId).emit('call-made', {
        offer: data.offer,
        socket: socket.id,
        callerId: data.callerId,
        callerName: data.callerName,
        callType: data.callType,
        roomId: data.roomId
      });
    } else {
      console.log(`   ❌ Recipient NOT found in onlineUsers map`);
      console.log(`   Current online IDs:`, Array.from(onlineUsers.keys()));
      // Optional: Emit an error back to caller
    }
  });

  socket.on('make-answer', (data) => {
    io.to(data.to).emit('answer-made', {
      socket: socket.id,
      answer: data.answer
    });
  });

  socket.on('reject-call', (data) => {
    io.to(data.to).emit('call-rejected', {
      socket: socket.id
    });
  });

  socket.on('end-call', (data) => {
    io.to(data.to).emit('call-ended');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove user from online users
    for (const [userId, userData] of onlineUsers.entries()) {
      if (userData.socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userData.name} removed from online users`);
        // Broadcast updated online users list
        io.emit('online-users', Array.from(onlineUsers.values()));
        break;
      }
    }
  });
});

// MongoDB Connection
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log("❌ MongoDB Error:", err));
} else {
  console.log("⚠️  MONGO_URI not set in .env file, skipping database connection");
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/consultations', require('./routes/consultationRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/hospitals', require('./routes/hospitalRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/pharmacy', require('./routes/pharmacyRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/vitals', require('./routes/vitalRoutes'));
app.use('/api/voice-notes', require('./routes/voiceNoteRoutes'));
app.use('/api/calls', require('./routes/callRoutes'));
app.use('/api/lhw', require('./routes/lhwRoutes'));
app.use('/api/pharmacist', require('./routes/pharmacistRoutes'));

// Test Route
app.get("/", (req, res) => {
  res.send("Backend Working ✅");
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);

  // Initialize consultation reminder system
  const { initializeConsultationReminders } = require('./services/consultationReminderService');
  initializeConsultationReminders(io);
  console.log('📅 Consultation reminder system started');
});
