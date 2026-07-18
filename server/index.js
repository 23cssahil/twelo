require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const socketIo = require('socket.io');

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://23cssahil_db_user:xsBXlihiFfWrsEZY@cluster0.pmn7via.mongodb.net/twelo_db?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Generate custom unique ID for User (8 chars alphanumeric)
const generateUniqueId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, process.env.JWT_SECRET || 'insta_jwt_secret_key_12345', (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let uniqueId = generateUniqueId();
    let idExists = await User.findOne({ uniqueId });
    while (idExists) {
      uniqueId = generateUniqueId();
      idExists = await User.findOne({ uniqueId });
    }

    const newUser = new User({
      username,
      password: hashedPassword,
      uniqueId,
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully', uniqueId });
  } catch (error) {
    res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, uniqueId: user.uniqueId },
      process.env.JWT_SECRET || 'insta_jwt_secret_key_12345',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        uniqueId: user.uniqueId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// User Search Route
app.get('/api/users/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    // Search by exact unique ID or matching username (case insensitive)
    const users = await User.find({
      $or: [
        { uniqueId: query.trim() },
        { username: { $regex: query.trim(), $options: 'i' } }
      ],
      _id: { $ne: req.user.userId } // Exclude self
    }).select('-password');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Search error', error: error.message });
  }
});

// Get My Profile (with stats)
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Get Incoming Requests
app.get('/api/users/requests', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('friendRequests', 'username uniqueId');
    res.json(user.friendRequests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching requests' });
  }
});

// Send Follow/Friend Request
app.post('/api/users/follow/:id', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    if (targetUserId === req.user.userId) return res.status(400).json({ message: "Cannot follow yourself" });

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    // Check if already following or request already sent
    if (targetUser.followers.includes(req.user.userId)) return res.status(400).json({ message: "Already following" });
    if (targetUser.friendRequests.includes(req.user.userId)) return res.status(400).json({ message: "Request already sent" });

    targetUser.friendRequests.push(req.user.userId);
    await targetUser.save();
    res.json({ message: "Request sent successfully" });
  } catch (error) {
    res.status(500).json({ message: 'Error sending request' });
  }
});

// Accept Friend Request
app.post('/api/users/accept/:id', authenticateToken, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUser = await User.findById(req.user.userId);
    
    // Remove from requests
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
    
    // Add to followers
    if (!currentUser.followers.includes(requesterId)) {
      currentUser.followers.push(requesterId);
    }
    await currentUser.save();

    // Add current user to requester's following
    const requester = await User.findById(requesterId);
    if (requester && !requester.following.includes(req.user.userId)) {
      requester.following.push(req.user.userId);
      await requester.save();
    }

    res.json({ message: "Request accepted" });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting request' });
  }
});

// Get Messages Route
app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// Get all chats for current user (recent conversations list)
app.get('/api/chats/recent', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Find all users the current user has chatted with
    const sentMessages = await Message.distinct('receiver', { sender: currentUserId });
    const receivedMessages = await Message.distinct('sender', { receiver: currentUserId });
    
    // Combine unique user IDs
    const chattedUserIds = [...new Set([...sentMessages, ...receivedMessages])];
    
    const users = await User.find({ _id: { $in: chattedUserIds } }).select('username uniqueId');
    
    // Add latest message summary if needed, but we'll fetch details for simplicity
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent chats', error: error.message });
  }
});

// Socket.io Real-time Setup
// Store mapping of userId -> socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Register user online
  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  // Handle incoming private message
  socket.on('send_message', async ({ senderId, receiverId, messageText }) => {
    try {
      const message = new Message({
        sender: senderId,
        receiver: receiverId,
        message: messageText
      });
      await message.save();

      const receiverSocketId = onlineUsers.get(receiverId);
      const senderSocketId = onlineUsers.get(senderId);

      const payload = {
        _id: message._id,
        sender: senderId,
        receiver: receiverId,
        message: messageText,
        createdAt: message.createdAt
      };

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', payload);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit('receive_message', payload);
      }
    } catch (err) {
      console.error('Error saving/sending message:', err);
    }
  });

  // --- WebRTC Audio/Video Call Events ---
  
  // Call User (Initiate call)
  socket.on('call_user', ({ userToCall, signalData, from, fromUsername, isVideo }) => {
    const receiverSocketId = onlineUsers.get(userToCall);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming_call', {
        signal: signalData,
        from,
        fromUsername,
        isVideo
      });
    }
  });

  // Answer Call
  socket.on('answer_call', ({ to, signal }) => {
    const callerSocketId = onlineUsers.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', signal);
    }
  });

  // Decline/End Call
  socket.on('end_call', ({ to }) => {
    const otherSocketId = onlineUsers.get(to);
    if (otherSocketId) {
      io.to(otherSocketId).emit('call_ended');
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
