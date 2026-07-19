require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const socketIo = require('socket.io');
const { OAuth2Client } = require('google-auth-library');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const googleClient = new OAuth2Client('440916901093-30lfk61qkml9b9bd6jb00bcot13csvsv.apps.googleusercontent.com');


function generateAvatarUrl(gender) {
  const g = (gender || 'male').toLowerCase();
  if (g === 'female') {
    const femaleSeeds = ['Anita', 'Sara', 'Jessica', 'Daisy', 'Lily', 'Bella'];
    const seed = femaleSeeds[Math.floor(Math.random() * femaleSeeds.length)];
    return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
  } else {
    const maleSeeds = ['Felix', 'Leo', 'Alex', 'Jack', 'Ryan', 'Oliver'];
    const seed = maleSeeds[Math.floor(Math.random() * maleSeeds.length)];
    return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
  }
}

const User = require('./models/User');
const DeletedUser = require('./models/DeletedUser');
const Message = require('./models/Message');
const Report = require('./models/Report');

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

// Setup Uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

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
      audience: '440916901093-30lfk61qkml9b9bd6jb00bcot13csvsv.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email } = payload;

    const user = await User.findOne({ googleId });
    if (!user) {
      return res.json({ isNewUser: true, email, googleId });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the admin.' });
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
        uniqueId: user.uniqueId,
        avatarUrl: user.avatarUrl,
        country: user.country,
        age: user.age,
        gender: user.gender
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during Google login', error: error.message });
  }
});

  app.post('/api/auth/complete_profile', async (req, res) => {
  try {
    const { name, email, googleId, age, country, gender } = req.body;
    if (!name || !email || !googleId || !age || !country || !gender) return res.status(400).json({ message: 'All fields required' });

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

    let avatarUrl = generateAvatarUrl(gender);

    const newUser = new User({ username, name, email, googleId, uniqueId, age: Number(age), country, gender: gender.toLowerCase(), avatarUrl });
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
        uniqueId: newUser.uniqueId,
        avatarUrl: newUser.avatarUrl,
        country: newUser.country,
        age: newUser.age,
        gender: newUser.gender
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error completing profile', error: error.message });
  }
});

app.get('/api/users/search', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { uniqueId: { $regex: query, $options: 'i' } }
      ]
    }).limit(10).select('username uniqueId avatarUrl friendRequests followers');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Search error' });
  }
});

// Search History
app.post('/api/users/search-history/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const targetId = req.params.id;
    if (targetId === req.user.userId) return res.json({ message: 'Self ignored' });
    
    // Remove if already exists so we can move it to top
    user.searchHistory = user.searchHistory.filter(id => id.toString() !== targetId);
    user.searchHistory.unshift(targetId); // Add to beginning
    // Keep only last 20
    if (user.searchHistory.length > 20) user.searchHistory = user.searchHistory.slice(0, 20);
    
    await user.save();
    res.json({ message: 'Added to search history' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving search history' });
  }
});

app.get('/api/users/search-history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('searchHistory', 'username uniqueId avatarUrl friendRequests followers');
    res.json(user.searchHistory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching search history' });
  }
});

// Get My Profile (with stats and coin logic)
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (!user.avatarUrl || user.avatarUrl.includes('randomuser.me') || user.avatarUrl.includes('iran.liara.run') || user.avatarUrl.includes('top=')) {
      user.avatarUrl = generateAvatarUrl(user.gender);
      User.updateOne({ _id: user._id }, { $set: { avatarUrl: user.avatarUrl } }).catch(console.error);
    }

    // Daily Coin Replenishment Logic
    const now = new Date();
    const lastRefill = new Date(user.lastCoinReplenishDate || Date.now());
    const hoursSinceRefill = Math.abs(now - lastRefill) / 36e5;

    if (hoursSinceRefill >= 24) {
      if (user.coins < 10) {
        user.coins = 10;
        user.lastCoinReplenishDate = now;
        await user.save();
      } else {
        user.lastCoinReplenishDate = now; // Just update the timer
        await user.save();
      }
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Change Username
app.post('/api/users/change_username', authenticateToken, async (req, res) => {
  try {
    const { newUsername } = req.body;
    if (!newUsername || newUsername.trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }

    const trimmedUsername = newUsername.trim().toLowerCase();
    const existingUser = await User.findOne({ username: trimmedUsername });
    
    if (existingUser && existingUser._id.toString() !== req.user.userId) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const user = await User.findById(req.user.userId);
    user.username = trimmedUsername;
    await user.save();

    // Generate new token with updated username
    const jwtToken = jwt.sign(
      { userId: user._id, username: user.username, uniqueId: user.uniqueId },
      process.env.JWT_SECRET || 'insta_jwt_secret_key_12345',
      { expiresIn: '7d' }
    );

    res.json({ message: 'Username updated successfully', token: jwtToken, username: user.username });
  } catch (error) {
    res.status(500).json({ message: 'Error updating username' });
  }
});

// Get Public Profile
app.get('/api/users/public_profile/:id', authenticateToken, async (req, res) => {
  try {
    let user = await User.findById(req.params.id).select('username uniqueId followers following friendRequests avatarUrl country age gender').lean();
    if (!user) {
      return res.json({
        _id: req.params.id,
        username: "Deleted Account",
        uniqueId: "none",
        followers: [],
        following: [],
        friendRequests: [],
        avatarUrl: '',
        isDeleted: true
      });
    }
    if (!user.avatarUrl || user.avatarUrl.includes('randomuser.me') || user.avatarUrl.includes('iran.liara.run') || user.avatarUrl.includes('top=')) {
      user.avatarUrl = generateAvatarUrl(user.gender);
      User.updateOne({ _id: user._id }, { $set: { avatarUrl: user.avatarUrl } }).catch(console.error);
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public profile' });
  }
});

// Get Public Profile by Unique ID
app.get('/api/users/public_profile_by_uid/:uniqueId', authenticateToken, async (req, res) => {
  try {
    let user = await User.findOne({ uniqueId: req.params.uniqueId }).select('username uniqueId followers following friendRequests avatarUrl country age gender').lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.avatarUrl || user.avatarUrl.includes('randomuser.me') || user.avatarUrl.includes('iran.liara.run') || user.avatarUrl.includes('top=')) {
      user.avatarUrl = generateAvatarUrl(user.gender);
      await User.updateOne({ _id: user._id }, { $set: { avatarUrl: user.avatarUrl } });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public profile' });
  }
});

// Get Notifications (auto-migrates old friendRequests)
app.get('/api/users/notifications', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('notifications.user', 'username uniqueId avatarUrl');
    
    // Auto-migrate old friendRequests to notifications
    let migrated = false;
    for (let reqId of (user.friendRequests || [])) {
      const exists = user.notifications.some(n => n.user && n.user._id && n.user._id.toString() === reqId.toString());
      if (!exists) {
        user.notifications.push({ type: 'follow_request', user: reqId, createdAt: new Date(Date.now() - 10000) });
        migrated = true;
      }
    }
    
    // Auto-migrate existing followers into notifications as accepted requests
    for (let followerId of (user.followers || [])) {
      const exists = user.notifications.some(n => n.user && n.user._id && n.user._id.toString() === followerId.toString());
      if (!exists) {
        user.notifications.push({ type: 'follow_request', user: followerId, createdAt: new Date(Date.now() - 86400000) });
        migrated = true;
      }
    }

    // Auto-migrate existing following into notifications as accepted requests (for the user)
    for (let followingId of (user.following || [])) {
      const exists = user.notifications.some(n => n.user && n.user._id && n.user._id.toString() === followingId.toString() && n.type === 'request_accepted');
      if (!exists) {
        user.notifications.push({ type: 'request_accepted', user: followingId, createdAt: new Date(Date.now() - 86400000) });
        migrated = true;
      }
    }

    if (migrated) {
      await user.save();
      const populatedUser = await User.findById(req.user.userId).populate('notifications.user', 'username uniqueId avatarUrl');
      const sorted = populatedUser.notifications.sort((a, b) => b.createdAt - a.createdAt);
      return res.json(sorted);
    }
    
    const sorted = user.notifications.sort((a, b) => b.createdAt - a.createdAt);
    res.json(sorted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark all notifications as read
app.post('/api/users/notifications/read', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    let modified = false;
    user.notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        modified = true;
      }
    });
    if (modified) await user.save();
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notifications as read' });
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
    targetUser.notifications.push({ type: 'follow_request', user: req.user.userId });
    await targetUser.save();
    res.json({ message: "Request sent successfully" });
  } catch (error) {
    res.status(500).json({ message: 'Error sending request' });
  }
});

// Send Anonymous Follow Request (costs 5 coins)
app.post('/api/users/anonymous_follow/:id', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    if (targetUserId === req.user.userId) return res.status(400).json({ message: "Cannot follow yourself" });

    const currentUser = await User.findById(req.user.userId);
    if (!currentUser || currentUser.coins < 5) {
      return res.status(400).json({ message: "Not enough coins. You need 5 coins to send a request." });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (targetUser.followers.includes(req.user.userId)) return res.status(400).json({ message: "Already following" });
    if (targetUser.friendRequests.includes(req.user.userId)) return res.status(400).json({ message: "Request already sent" });

    // Deduct 5 coins
    currentUser.coins -= 5;
    await currentUser.save();

    targetUser.friendRequests.push(req.user.userId);
    targetUser.notifications.push({ type: 'follow_request', user: req.user.userId });
    await targetUser.save();

    res.json({ message: "Request sent successfully", coinsLeft: currentUser.coins });
  } catch (error) {
    res.status(500).json({ message: 'Error sending anonymous request' });
  }
});

// Accept Friend Request
app.post('/api/users/accept/:id', authenticateToken, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUser = await User.findById(req.user.userId);
    
    // Remove from friendRequests so it doesn't stay pending forever
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
    
    // Add to followers
    if (!currentUser.followers.includes(requesterId)) {
      currentUser.followers.push(requesterId);
    }
    await currentUser.save();

    // Add current user to requester's following
    const requester = await User.findById(requesterId);
    if (requester) {
      if (!requester.following.includes(req.user.userId)) {
        requester.following.push(req.user.userId);
      }
      requester.notifications.push({ type: 'request_accepted', user: req.user.userId });
      await requester.save();
    }

    res.json({ message: "Request accepted" });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting request' });
  }
});

// Reject Friend Request
app.post('/api/users/reject/:id', authenticateToken, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUser = await User.findById(req.user.userId);
    
    // Remove from friendRequests
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
    await currentUser.save();

    res.json({ message: "Request rejected" });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting request' });
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
      targetUser.friendRequests = targetUser.friendRequests.filter(id => id.toString() !== currentUserId);
      await currentUser.save();
      await targetUser.save();
    }

    res.json({ message: "Unfollowed successfully" });
  } catch (error) {
    res.status(500).json({ message: 'Error unfollowing user' });
  }
});

// Delete Account
app.post('/api/users/delete_account', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    const currentUserId = req.user.userId;

    const user = await User.findById(currentUserId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.username !== username) {
      return res.status(400).json({ message: 'Username does not match. Deletion failed.' });
    }

    // Move to DeletedUser
    const deletedUserData = user.toObject();
    delete deletedUserData._id; // Let mongoose generate a new ID or keep it? We can keep it or not. We'll drop it so it creates a new one.
    
    const archivedUser = new DeletedUser(deletedUserData);
    await archivedUser.save();

    // Clean up references in other users
    await User.updateMany(
      { $or: [{ followers: currentUserId }, { following: currentUserId }, { friendRequests: currentUserId }] },
      { $pull: { followers: currentUserId, following: currentUserId, friendRequests: currentUserId } }
    );

    // Delete actual user
    await User.findByIdAndDelete(currentUserId);

    res.json({ message: 'Account permanently deleted' });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: 'Error deleting account' });
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
      $and: [
        {
          $or: [
            { sender: currentUserId, receiver: otherUserId },
            { sender: otherUserId, receiver: currentUserId }
          ]
        },
        { deletedBy: { $ne: currentUserId } }
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
    
    const users = await User.find({ _id: { $in: chattedUserIds } }).select('username uniqueId avatarUrl gender').lean();
    const foundUserIds = users.map(u => u._id.toString());
    
    users.forEach(u => {
      if (!u.avatarUrl || u.avatarUrl.includes('randomuser.me') || u.avatarUrl.includes('iran.liara.run') || u.avatarUrl.includes('top=')) {
        u.avatarUrl = generateAvatarUrl(u.gender);
        User.updateOne({ _id: u._id }, { $set: { avatarUrl: u.avatarUrl } }).catch(console.error);
      }
    });

    const missingUserIds = chattedUserIds.filter(id => !foundUserIds.includes(id.toString()));
    missingUserIds.forEach(id => {
      users.push({
        _id: id,
        username: "Deleted Account",
        uniqueId: "none",
        avatarUrl: '',
        isDeleted: true
      });
    });
    
    // Fetch last message for each user to sort them
    for (let i = 0; i < users.length; i++) {
      const lastMsg = await Message.findOne({
        $and: [
          {
            $or: [
              { sender: currentUserId, receiver: users[i]._id },
              { sender: users[i]._id, receiver: currentUserId }
            ]
          },
          { deletedBy: { $ne: currentUserId } }
        ]
      }).sort({ createdAt: -1 }).select('createdAt');
      users[i].lastMessageAt = lastMsg ? lastMsg.createdAt : new Date(0);
    }
    
    // Sort users by lastMessageAt descending
    users.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent chats', error: error.message });
  }
});

// Socket.io Real-time Setup
const onlineUsers = new Map();
// ==========================================
// REPORTS ROUTES (USER)
// ==========================================
app.post('/api/reports/create', authenticateToken, async (req, res) => {
  try {
    const { reportedUserId, reportedUsername, reason, chatContext } = req.body;
    const reporterId = req.user.userId;
    const reporter = await User.findById(reporterId);

    const newReport = new Report({
      reporterId,
      reporterUsername: reporter.username,
      reportedUserId,
      reportedUsername,
      reason,
      chatContext
    });

    await newReport.save();
    res.json({ success: true, message: 'Report submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error submitting report' });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================
const adminAuth = (req, res, next) => {
  const pass = req.headers['x-admin-pass'];
  if (pass === 'twelo-admin-6006390989') {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized Admin Access' });
  }
};

app.get('/api/admin/stats', adminAuth, (req, res) => {
  res.json({
    activeUsers: onlineUsers.size,
    randomRooms: activeRandomChats.size,
    queuedRandom: randomChatQueue.length
  });
});

app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const query = req.query.q;
    let filter = {};
    if (query) {
      filter = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { googleId: { $regex: query, $options: 'i' } }
        ]
      };
    }
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).limit(query ? 50 : 5000);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

app.post('/api/admin/block', adminAuth, async (req, res) => {
  try {
    const { userId, isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });
    if (isBlocked) {
      const socketId = onlineUsers.get(userId);
      if (socketId) {
        io.to(socketId).emit('force_logout', { message: 'You have been blocked by the admin.' });
      }
    }
    res.json({ success: true, isBlocked: user.isBlocked });
  } catch (error) {
    res.status(500).json({ message: 'Error blocking user' });
  }
});

app.post('/api/admin/broadcast', adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    
    // Save to all users' notifications
    const newNotif = { type: 'system_alert', message, read: false };
    await User.updateMany({}, { $push: { notifications: newNotif } });

    // Emit to online users
    io.emit('new_notification');
    io.emit('system_alert_toast', { message, type: 'broadcast' });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error sending broadcast' });
  }
});

app.post('/api/admin/notify-user', adminAuth, async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    const newNotif = { type: 'system_alert', message, read: false };
    await User.findByIdAndUpdate(userId, { $push: { notifications: newNotif } });

    const socketId = onlineUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('new_notification');
      io.to(socketId).emit('system_alert_toast', { message, type: 'personal' });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error sending personal notification' });
  }
});

app.post('/api/admin/delete-user', adminAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Move to DeletedUser (or simply delete for admin wipe)
    const deletedUserData = user.toObject();
    delete deletedUserData._id;
    const archivedUser = new DeletedUser(deletedUserData);
    await archivedUser.save();

    // Clean up references in other users
    await User.updateMany(
      { $or: [{ followers: userId }, { following: userId }, { friendRequests: userId }] },
      { $pull: { followers: userId, following: userId, friendRequests: userId } }
    );

    await User.findByIdAndDelete(userId);

    const socketId = onlineUsers.get(userId);
    if (socketId) {
      io.to(socketId).emit('force_logout', { message: 'Your account has been permanently deleted by the admin.' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Admin Route to fetch all chats for a specific user
app.get('/api/admin/users/:id/chats', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await Message.find({
      $or: [{ sender: id }, { receiver: id }]
    })
      .populate('sender', 'username')
      .populate('receiver', 'username')
      .sort({ createdAt: -1 })
      .limit(500); // limit to last 500 messages to prevent overload
    res.json(messages);
  } catch (error) {
    console.error("Error fetching user chats:", error);
    res.status(500).json({ message: 'Error fetching user chats' });
  }
});

app.post('/api/admin/clear-queue', adminAuth, (req, res) => {
  randomChatQueue = [];
  res.json({ success: true, queuedRandom: 0 });
});

app.get('/api/admin/reports', adminAuth, async (req, res) => {
  try {
    const reports = await Report.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports' });
  }
});

app.post('/api/admin/reports/:id/resolve', adminAuth, async (req, res) => {
  try {
    await Report.findByIdAndUpdate(req.params.id, { status: 'resolved' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving report' });
  }
});

// Random Chat Queue
let randomChatQueue = []; // [{ userId, socketId }]
const activeRandomChats = new Map(); // roomId -> { user1, user2 }

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Register user online
  socket.on('register', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  // Handle incoming private message
  socket.on('send_message', async ({ senderId, receiverId, messageText, replyTo, messageType = 'text', fileUrl = null, isViewOnce = false }) => {
    try {
      const message = new Message({
        sender: senderId,
        receiver: receiverId,
        message: messageText,
        replyTo: replyTo,
        messageType: messageType,
        fileUrl: fileUrl,
        isViewOnce: isViewOnce
      });
      await message.save();

      const receiverSocketId = onlineUsers.get(receiverId);
      const senderSocketId = onlineUsers.get(senderId);

      const payload = {
        _id: message._id,
        sender: senderId,
        receiver: receiverId,
        message: messageText,
        replyTo: replyTo,
        messageType: messageType,
        fileUrl: fileUrl,
        isViewOnce: isViewOnce,
        isViewed: false,
        createdAt: message.createdAt
      };

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', payload);
      }
      // Only echo to sender if they are on a different device/tab
      if (senderSocketId && senderSocketId !== socket.id) {
        io.to(senderSocketId).emit('receive_message', payload);
      }
    } catch (error) {
      console.error(error);
    }
  });

  // Handle message deletion
  socket.on('delete_message', async ({ messageId, type, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      if (type === 'everyone') {
        // Only sender can delete for everyone
        if (message.sender.toString() === userId) {
          await Message.findByIdAndDelete(messageId);
          const receiverSocketId = onlineUsers.get(message.receiver.toString());
          const senderSocketId = onlineUsers.get(message.sender.toString());
          const payload = { messageId, type: 'everyone' };
          
          if (receiverSocketId) io.to(receiverSocketId).emit('message_deleted', payload);
          if (senderSocketId) io.to(senderSocketId).emit('message_deleted', payload);
        }
      } else if (type === 'me') {
        // Add to deletedBy array
        await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedBy: userId } });
        const socketId = onlineUsers.get(userId);
        if (socketId) io.to(socketId).emit('message_deleted', { messageId, type: 'me' });
      }
    } catch (error) {
      console.error(error);
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

  socket.on('reject_friend_request', ({ requesterId }) => {
    const receiverSocketId = onlineUsers.get(requesterId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('request_rejected_alert');
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

  // --- Anonymous Random Chat Events ---
  socket.on('search_random', async (payload) => {
    // Handle both old string payload and new object payload from updated clients
    const userId = typeof payload === 'string' ? payload : payload.userId;
    const isBotEligible = typeof payload === 'object' ? payload.isBotEligible : false;

    if (!randomChatQueue.some(u => u.userId === userId)) {
      randomChatQueue.push({ userId, socketId: socket.id });
    }

    if (randomChatQueue.length >= 2) {
      const user1 = randomChatQueue.shift();
      const user2 = randomChatQueue.shift();
      
      const roomId = `random_${Date.now()}_${Math.random().toString(36).substring(2,8)}`;
      activeRandomChats.set(roomId, { user1, user2 });

      try {
        const user1Record = await User.findById(user1.userId);
        const user2Record = await User.findById(user2.userId);

        io.to(user1.socketId).emit('match_found', { 
          roomId, 
          partnerId: user2.userId,
          partnerAvatar: user2Record?.avatarUrl,
          partnerCountry: user2Record?.country
        });
        io.to(user2.socketId).emit('match_found', { 
          roomId, 
          partnerId: user1.userId,
          partnerAvatar: user1Record?.avatarUrl,
          partnerCountry: user1Record?.country
        });
      } catch (err) {
        console.error("Error fetching random chat users", err);
      }
      return;
    }

    if (isBotEligible) {
      setTimeout(() => {
        // After 4 seconds, check if user is STILL in queue
        const userIndex = randomChatQueue.findIndex(u => u.userId === userId);
        if (userIndex !== -1) {
          // Remove from queue
          randomChatQueue.splice(userIndex, 1);
          
          // Match with Bot!
          const roomId = `bot_room_${Date.now()}_${userId}`;
          const botUser = { userId: 'twelo-bot', socketId: 'bot-socket' };
          
          activeRandomChats.set(roomId, { user1: { userId, socketId: socket.id }, user2: botUser, botState: 'waiting_for_hi' });

          io.to(socket.id).emit('match_found', {
             roomId,
             partnerId: 'twelo-bot',
             partnerAvatar: generateAvatarUrl('female'), // Random bot avatar
             partnerCountry: 'India',
             partnerUsername: 'Stranger'
          });

          // Bot sends first message "hi" after delay
          setTimeout(() => {
             io.to(socket.id).emit('receive_anonymous_typing', { isTyping: true });
             setTimeout(() => {
                io.to(socket.id).emit('receive_anonymous_typing', { isTyping: false });
                io.to(socket.id).emit('receive_anonymous_message', {
                  _id: `anon-bot-${Date.now()}`,
                  message: `hi`,
                  senderSocket: 'bot-socket',
                  createdAt: new Date().toISOString()
                });
             }, 2500); // typing for 2.5s
          }, 1500); // wait 1.5s before starting to type

        }
      }, 4000); // exactly 4 seconds
    }
  });

  socket.on('cancel_search', (userId) => {
    randomChatQueue = randomChatQueue.filter(u => u.userId !== userId);
  });

  socket.on('send_anonymous_message', ({ roomId, messageText }) => {
    const chat = activeRandomChats.get(roomId);
    if (!chat) return;

    if (roomId.startsWith('bot_room_')) {
      const msgLower = messageText.toLowerCase().trim();
      
      // Simulate bot typing and replying
      setTimeout(() => {
        io.to(socket.id).emit('receive_anonymous_typing', { isTyping: true });
        
        setTimeout(() => {
          io.to(socket.id).emit('receive_anonymous_typing', { isTyping: false });
          
          if (chat.botState === 'waiting_for_hi') {
            chat.botState = 'waiting_for_how_are_you_reply';
            io.to(socket.id).emit('receive_anonymous_message', {
              _id: `anon-bot-${Date.now()}`,
              message: `how are you`,
              senderSocket: 'bot-socket',
              createdAt: new Date().toISOString()
            });
          } else if (chat.botState === 'waiting_for_how_are_you_reply') {
            chat.botState = 'waiting_for_gender';
            io.to(socket.id).emit('receive_anonymous_message', {
              _id: `anon-bot-${Date.now()}`,
              message: `M or F`,
              senderSocket: 'bot-socket',
              createdAt: new Date().toISOString()
            });
          } else if (chat.botState === 'waiting_for_gender') {
            // Bot leaves regardless of what they reply at this stage
            io.to(socket.id).emit('anonymous_chat_ended');
            activeRandomChats.delete(roomId);
          }
        }, 2000); // 2s typing time
      }, 1000); // 1s wait before starting to type
      
      return;
    }

    const senderSocketId = socket.id;
    const receiverSocketId = chat.user1.socketId === socket.id ? chat.user2.socketId : chat.user1.socketId;
    
    io.to(receiverSocketId).emit('receive_anonymous_message', { 
      _id: `anon-${Date.now()}`,
      message: messageText, 
      senderSocket: senderSocketId,
      createdAt: new Date().toISOString()
    });
  });

  socket.on('send_anonymous_typing', ({ roomId, isTyping }) => {
    const chat = activeRandomChats.get(roomId);
    if (!chat) return;
    if (roomId.startsWith('bot_room_')) return; // Bot doesn't care if user is typing

    const receiverSocketId = chat.user1.socketId === socket.id ? chat.user2.socketId : chat.user1.socketId;
    io.to(receiverSocketId).emit('receive_anonymous_typing', { isTyping });
  });

  socket.on('leave_anonymous_chat', ({ roomId }) => {
    const chat = activeRandomChats.get(roomId);
    if (chat) {
      if (roomId.startsWith('bot_room_')) {
         activeRandomChats.delete(roomId);
         return;
      }
      const receiverSocketId = chat.user1.socketId === socket.id ? chat.user2.socketId : chat.user1.socketId;
      io.to(receiverSocketId).emit('anonymous_chat_ended');
      activeRandomChats.delete(roomId);
    }
  });

  // Handle user disconnect
  socket.on('mark_viewed', async ({ messageId, receiverId, senderId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { isViewed: true });
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message_viewed', { messageId, receiverId });
      }
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message_viewed', { messageId, receiverId });
      }
    } catch (error) {
      console.error('Error marking viewed:', error);
    }
  });

  socket.on('disconnect', () => {
    randomChatQueue = randomChatQueue.filter(u => u.socketId !== socket.id);
    
    for (const [roomId, chat] of activeRandomChats.entries()) {
      if (chat.user1.socketId === socket.id || chat.user2.socketId === socket.id) {
        const receiverSocketId = chat.user1.socketId === socket.id ? chat.user2.socketId : chat.user1.socketId;
        io.to(receiverSocketId).emit('anonymous_chat_ended');
        activeRandomChats.delete(roomId);
      }
    }

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
