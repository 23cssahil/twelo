require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const socketIo = require('socket.io');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '123456789-placeholder.apps.googleusercontent.com');

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
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID || '123456789-placeholder.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email } = payload;

    const user = await User.findOne({ googleId });
    if (!user) {
      return res.json({ isNewUser: true, email, googleId });
    }

    const jwtToken = jwt.sign(
      { userId: user._id, username: user.username, uniqueId: user.uniqueId },
      process.env.JWT_SECRET || 'insta_jwt_secret_key_12345',
      { expiresIn: '7d' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        username: user.username,
        uniqueId: user.uniqueId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during Google login', error: error.message });
  }
});

app.post('/api/auth/complete_profile', async (req, res) => {
  try {
    const { name, email, googleId } = req.body;
    if (!name || !email || !googleId) return res.status(400).json({ message: 'All fields required' });

    const existingUser = await User.findOne({ googleId });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    let uniqueId = generateUniqueId();
    let idExists = await User.findOne({ uniqueId });
    while (idExists) {
      uniqueId = generateUniqueId();
      idExists = await User.findOne({ uniqueId });
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    let username = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + randomNum;
    let userExists = await User.findOne({ username });
    while (userExists) {
      username = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + Math.floor(1000 + Math.random() * 9000);
      userExists = await User.findOne({ username });
    }

    const newUser = new User({ username, name, email, googleId, uniqueId });
    await newUser.save();

    const jwtToken = jwt.sign(
      { userId: newUser._id, username: newUser.username, uniqueId: newUser.uniqueId },
      process.env.JWT_SECRET || 'insta_jwt_secret_key_12345',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token: jwtToken,
      user: {
        id: newUser._id,
        username: newUser.username,
        uniqueId: newUser.uniqueId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error completing profile', error: error.message });
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

// Get Public Profile
app.get('/api/users/public_profile/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('username uniqueId followers following friendRequests');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public profile' });
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

// Unfollow User
app.post('/api/users/unfollow/:id', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.userId;

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (currentUser && targetUser) {
      currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);
      await currentUser.save();
      await targetUser.save();
    }

    res.json({ message: "Unfollowed successfully" });
  } catch (error) {
    res.status(500).json({ message: 'Error unfollowing user' });
  }
});

// Get User Connections (Followers & Following)
app.get('/api/users/connections/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'username uniqueId')
      .populate('following', 'username uniqueId');
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Privacy check: only allow viewing if mutually connected or viewing own profile
    const isOwnProfile = req.params.id === req.user.userId;
    const isFollowing = user.followers.some(f => f._id.toString() === req.user.userId);
    
    if (!isOwnProfile && !isFollowing) {
      return res.status(403).json({ message: "Not authorized to view connections" });
    }

    res.json({ followers: user.followers, following: user.following });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching connections' });
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

  // --- Real-time Notifications ---
  socket.on('send_friend_request', ({ targetUserId }) => {
    const receiverSocketId = onlineUsers.get(targetUserId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new_notification');
    }
  });

  socket.on('accept_friend_request', ({ requesterId }) => {
    const receiverSocketId = onlineUsers.get(requesterId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('request_accepted_alert');
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
