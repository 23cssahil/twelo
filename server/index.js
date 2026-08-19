const { setupOptimizations, mongoOptions } = require('./serverConfig');
require('dotenv').config();
const Groq = require('groq-sdk');
const groqClient = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const AiBotSession = require('./models/AiBotSession');
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
const crypto = require('crypto');
const os = require('os');
const webpush = require('web-push');
const cloudinary = require('cloudinary').v2;
const { nudityCheck } = require('./middleware/nudityCheck');

webpush.setVapidDetails(
  'mailto:admin@twelo.com',
  'BKZ4Be1x-eWdYF_3Rh5ATnXYspYye1t7XY0KeiGkNbPxY5QnF_Bwc7PUkrF69G5-SuyVQvd6myaSYv6m4WC5AxA',
  '3ZmJhL9NsYAEHfMuCbFaZCgCEJ88pPFFLZ4e5w0uC6c'
);

const googleClient = new OAuth2Client('440916901093-30lfk61qkml9b9bd6jb00bcot13csvsv.apps.googleusercontent.com');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'insta_encryption_secret_key_1234567890123456';
const IV_LENGTH = 16;

function encryptEmail(text) {
  if (!text) return text;
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0')), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return 'enc_' + iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptEmail(text) {
  if (!text || !text.startsWith('enc_')) return text;
  try {
    let textParts = text.replace('enc_', '').split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0')), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text;
  }
}


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

// A transparent fallback for the random-chat queue.  The client labels this
// participant as an AI companion; it must never be presented as a real user.
const AI_COMPANION_FALLBACK_DELAY_MS = 2200;
const pickOne = (items) => items[Math.floor(Math.random() * items.length)];

const FEMALE_BOT_NAMES = ['Riya', 'Ananya', 'Priya', 'Neha', 'Pooja', 'Sanya', 'Diya', 'Nisha', 'Mehak', 'Tanya', 'Simran', 'Aisha'];
const MALE_BOT_NAMES = ['Aryan', 'Rohan', 'Kabir', 'Virat', 'Aarav', 'Karan', 'Sahil', 'Dev', 'Nikhil', 'Rahul', 'Aman', 'Siddharth'];

function createAiCompanion(userGender, userCountry = 'Earth', userCountryCode = 'UN', genderFilter = 'any') {
  // If user has set a gender filter, bot matches that filter gender
  // If no filter (any), bot is opposite gender by default
  let gender;
  if (genderFilter && genderFilter !== 'any') {
    gender = genderFilter; // bot = what user wanted to chat with
  } else {
    gender = userGender === 'female' ? 'male' : 'female'; // opposite by default
  }
  const namePool = gender === 'female' ? FEMALE_BOT_NAMES : MALE_BOT_NAMES;
  const botName = pickOne(namePool);
  return {
    id: `ai-companion-${crypto.randomUUID()}`,
    name: botName,
    gender,
    avatarUrl: generateAvatarUrl(gender),
    country: userCountry,
    countryCode: userCountryCode
  };
}

async function generateBotRuleFallback(chat, messageText) {
  const text = (messageText || '').trim().toLowerCase();
  const cleanText = text.replace(/[.,!?]/g, '');
  const textWords = cleanText.split(/\s+/).filter(Boolean);
  const textWordCount = Math.max(1, textWords.length);

  try {
    const BotRule = require('./models/BotRule');
    const rules = await BotRule.find({ isActive: true }).lean();
    let matchedRule = null;
    let maxMatchScore = 0;

    for (const rule of rules) {
      if (rule.botGender !== 'both' && rule.botGender !== chat.companion.gender) continue;
      rule.userMessageTriggers.forEach((trigger, idx) => {
        const t = trigger.toLowerCase().trim();
        if (!t) return;
        let isMatch = false;
        try {
          const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          isMatch = new RegExp(`\\b${escaped}\\b`, 'i').test(text);
        } catch(e) { isMatch = text.includes(t); }
        if (isMatch) {
          const tWords = t.split(/\s+/).filter(Boolean);
          const ratio = tWords.filter(w => textWords.includes(w)).length / textWordCount;
          if (ratio > 0.25 || cleanText === t) {
            const score = ratio + (1 - (cleanText.indexOf(t) / Math.max(1, cleanText.length))) * 0.001;
            if (score > maxMatchScore) { matchedRule = rule; maxMatchScore = score; matchedRule.matchedTriggerIndex = idx; }
          }
        }
      });
    }

    if (!matchedRule) {
      return { reply: pickOne(['hmm', 'achha', 'nice', 'sahi hai', 'aur batao 😊', 'haan bolo']), action: 'continue' };
    }

    const response = (matchedRule.botResponses && matchedRule.botResponses.length > 0) ? pickOne(matchedRule.botResponses) : 'hmm';
    const followUp = (matchedRule.botFollowUps && matchedRule.botFollowUps.length > 0) ? pickOne(matchedRule.botFollowUps) : '';
    return { reply: response, followUp, action: matchedRule.action || 'continue', followUpResponses: matchedRule.botFollowUpResponses || [] };
  } catch(e) {
    return { reply: 'haan bolo 😊', followUp: '', action: 'continue' };
  }
}

async function generateAiCompanionReply(chat, messageText, roomId) {
  // User requested to completely disable generative AI (Groq/Gemini) 
  // and only use the bot rules trained by the admin.
  return await generateBotRuleFallback(chat, messageText);
}


const User = require('./models/User');
const DeletedUser = require('./models/DeletedUser');
const Message = require('./models/Message');
const Report = require('./models/Report');
const Story = require('./models/Story');
const Comment = require('./models/Comment');
const redisService = require('./services/redisService');
const AdminData = require('./models/AdminData');
const BotRule = require('./models/BotRule');
const UserSession = require('./models/UserSession');
const CountryFact = require('./models/CountryFact');

const app = express();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

const countryFactIndexes = {};

async function getRandomCountryFact(countryCode) {
  try {
    if (countryCode && countryCode !== 'UN') {
      const cf = await CountryFact.findOne({ countryCode: countryCode.toUpperCase() });
      if (cf && cf.facts && cf.facts.length > 0) {
        if (countryFactIndexes[cf.countryCode] === undefined) countryFactIndexes[cf.countryCode] = 0;
        const index = countryFactIndexes[cf.countryCode];
        countryFactIndexes[cf.countryCode] = (index + 1) % cf.facts.length;
        return { fact: cf.facts[index], countryCode: cf.countryCode, countryName: cf.countryName };
      }
    }
    
    // If no countryCode provided, or it's 'UN', or no facts found for it, pick a random country that has facts
    const allFacts = await CountryFact.find({});
    if (allFacts.length > 0) {
      const randomCf = pickOne(allFacts);
      if (randomCf.facts && randomCf.facts.length > 0) {
        if (countryFactIndexes[randomCf.countryCode] === undefined) countryFactIndexes[randomCf.countryCode] = 0;
        const index = countryFactIndexes[randomCf.countryCode];
        countryFactIndexes[randomCf.countryCode] = (index + 1) % randomCf.facts.length;
        return { fact: randomCf.facts[index], countryCode: randomCf.countryCode, countryName: randomCf.countryName };
      }
    }
  } catch(e) {}
  return { fact: "A beautiful country with rich culture.", countryCode: 'UN', countryName: 'Earth' };
}
const server = http.createServer(app);
setupOptimizations(app, server);

// Encrypt old plaintext emails on startup to ensure privacy (Ignore already hashed/encrypted ones)
// Encrypt old plaintext emails on startup to ensure privacy (Ignore already hashed/encrypted ones)
mongoose.connection.once('open', async () => {
  try {
    const users = await User.find({ email: { $not: /^(hash_|enc_)/ } });
    for (let u of users) {
      if (u.email && !u.email.startsWith('hash_') && !u.email.startsWith('enc_')) {
        u.email = encryptEmail(u.email);
        await u.save();
      }
    }
  } catch(e) {
    console.error('Error encrypting old emails:', e);
  }

  try {
    await mongoose.connection.db.collection('stories').dropIndex('createdAt_1');
    console.log('Dropped old TTL index on stories.createdAt');
  } catch(e) {
    // Ignore if index doesn't exist
  }

  try {
    const comments = await Comment.find({});
    let fixedCount = 0;
    for (let c of comments) {
      if (!c.liked_by) c.liked_by = [];
      const uniqueLikes = [...new Set(c.liked_by.map(id => id.toString()))];
      c.liked_by = uniqueLikes.map(id => new mongoose.Types.ObjectId(id));
      c.likes_count = uniqueLikes.length;
      await c.save();
      fixedCount++;
    }
    if (fixedCount > 0) {
      console.log(`Fixed likes_count for ${fixedCount} comments.`);
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        const tempRedis = new (require('ioredis'))(redisUrl, {
          tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
        });
        const keys = await tempRedis.keys('story:*:top_comments');
        if (keys.length > 0) await tempRedis.del(...keys);
        tempRedis.quit();
      }
    }
  } catch(e) {
    console.error('Error fixing comment likes:', e);
  }
});

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const onlineUsers = new Map();
const activeSessions = new Map(); // socket.id -> { userId, startTime, messagesSent, matchesMade }

const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

// Connect to Upstash Redis for Horizontal Scaling
const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  const pubClient = new Redis(redisUrl, {
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null
  });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.log('Redis Pub Error:', err.message));
  subClient.on('error', (err) => console.log('Redis Sub Error:', err.message));

  io.adapter(createAdapter(pubClient, subClient));
  console.log('Redis Adapter initialized for Horizontal Scaling!');
} else {
  console.log('No REDIS_URL found. Running without Redis Adapter.');
}

app.use(cors());
app.use(express.json());

// Prevent browser caching for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Setup Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer to use memory storage (no disk write)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload Endpoint - uploads to Cloudinary via unsigned HTTP request
app.post('/api/upload', upload.single('file'), nudityCheck, async (req, res) => {
  console.log('Upload request received, file:', req.file?.originalname, 'size:', req.file?.size);
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  try {
    // Use Cloudinary SDK (Moderation is already handled by Sightengine middleware)
    cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ message: 'Upload failed', errorMsg: error.message, stack: error.stack });
        }
        
        console.log('Cloudinary upload success, URL:', result.secure_url, 'Moderation Status:', result.moderation ? result.moderation[0].status : 'N/A');
        res.json({ url: result.secure_url });
      }
    ).end(req.file.buffer);
  } catch (err) {
    console.error('Upload setup error:', err.message);
    res.status(500).json({ message: 'Upload setup failed', errorMsg: err.message, stack: err.stack });
  }
});

// AI Safety Check Endpoint (For preview tags, does NOT save to Cloudinary)
app.post('/api/check', upload.single('file'), nudityCheck, (req, res) => {
  res.json({ success: true, message: 'Image is safe', debug: req.sightengineResponse });
});


// Database Connection
let cachedGlobeStatus = { isEnabled: true, customMessage: 'Globe is currently offline.', enableAt: null };

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://23cssahil_db_user:xsBXlihiFfWrsEZY@cluster0.pmn7via.mongodb.net/twelo_db?retryWrites=true&w=majority&appName=Cluster0', mongoOptions)
  .then(() => {
    console.log('MongoDB Connected');
    AdminData.findOne().then(data => { if (data?.globeStatus) cachedGlobeStatus = data.globeStatus; }).catch(e => {});
  })
  .catch(err => console.error('MongoDB Connection Error:', err));
// Active Globe Timer Check
setInterval(() => {
  if (!cachedGlobeStatus.isEnabled && cachedGlobeStatus.enableAt) {
    const enableTime = new Date(cachedGlobeStatus.enableAt).getTime();
    if (Date.now() >= enableTime) {
      cachedGlobeStatus.isEnabled = true;
      cachedGlobeStatus.enableAt = null;
      io.emit('globe_status_update', cachedGlobeStatus);
      AdminData.findOne().then(adminData => {
        if(adminData) { adminData.globeStatus = cachedGlobeStatus; adminData.save(); }
      }).catch(e => console.error("Globe timer update error", e));
    }
  }
}, 1000);

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

    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (!user.lastDailyReward || now - new Date(user.lastDailyReward).getTime() > ONE_DAY) {
      user.coins = (user.coins || 0) + 3;
      user.lastDailyReward = new Date();
      await user.save();
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
    const { name, email, googleId, age, country, gender, referredBy } = req.body;
    if (!name || !email || !googleId || !age || !country || !gender) return res.status(400).json({ message: 'All fields required' });

    const existingUser = await User.findOne({ googleId });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const finalEmail = encryptEmail(email);

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

    let finalCountry = country;
    let countryCode = 'UN';

    // IP Geolocation Logic
    try {
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
      // Exclude localhost/private IPs from triggering the API (optional but safe)
      if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
        const response = await fetch(`http://ip-api.com/json/${clientIp}`);
        const geoData = await response.json();
        if (geoData && geoData.status === 'success') {
          finalCountry = geoData.country;
          countryCode = geoData.countryCode;
        }
      }
    } catch (geoErr) {
      console.error('IP Geolocation failed:', geoErr.message);
    }

    const newUser = new User({ 
      username, 
      name, 
      email: finalEmail, 
      googleId, 
      uniqueId, 
      age: Number(age), 
      country: finalCountry, 
      countryCode,
      gender: gender.toLowerCase(), 
      avatarUrl,
      coins: 3,
      lastDailyReward: new Date()
    });
    await newUser.save();

    if (referredBy) {
      try {
        const referrer = await User.findOne({ uniqueId: referredBy });
        if (referrer) {
          referrer.coins = (referrer.coins || 0) + 20; // Reward 20 coins for referral
          referrer.notifications.push({
            type: 'system',
            user: referrer._id,
            message: `Someone joined using your referral link! You earned 20 Coins.`,
            createdAt: new Date()
          });
          await referrer.save();
        }
      } catch(err) {
        console.error("Referral Error:", err);
      }
    }

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
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit) || 20;

    const filter = {};

    if (query) {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexQuery = new RegExp('^' + escapedQuery, 'i');
      filter.$or = [
        { username: regexQuery },
        { uniqueId: regexQuery }
      ];
    }

    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const users = await User.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .select('username uniqueId avatarUrl friendRequests followers');
      
    const hasMore = users.length > limit;
    if (hasMore) users.pop();

    const nextCursor = hasMore ? users[users.length - 1]._id : null;

    res.json({ users, nextCursor });
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
    const user = await User.findById(req.user.userId)
      .select('searchHistory')
      .populate('searchHistory', 'username uniqueId avatarUrl gender friendRequests followers')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json((user.searchHistory || []).filter(u => u != null));
  } catch (error) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ message: 'Error fetching search history' });
  }
});

app.delete('/api/users/search-history/:id', authenticateToken, async (req, res) => {
  try {
    const result = await User.updateOne(
      { _id: req.user.userId },
      { $pull: { searchHistory: req.params.id } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Removed from search history' });
  } catch (error) {
    console.error('Error removing from search history:', error);
    res.status(500).json({ message: 'Error removing from search history' });
  }
});
app.delete('/api/users/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    user.notifications = user.notifications.filter(n => n._id && n._id.toString() !== req.params.id);
    await user.save();
    res.json({ message: 'Notification removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error removing notification' });
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
        await User.updateOne({ _id: user._id }, { $set: { coins: 10, lastCoinReplenishDate: now } });
      } else {
        await User.updateOne({ _id: user._id }, { $set: { lastCoinReplenishDate: now } });
      }
    }

    const globalStories = await Story.find({ user: user._id, visibility: { $in: ['global', 'everyone'] } })
      .populate('viewedBy', 'username avatarUrl')
      .populate('likedBy', 'username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    user.globalStories = globalStories;

    // Mutual Followers Logic
    if (req.user && req.user.userId && req.user.userId !== user._id.toString()) {
      try {
        const currentUser = await User.findById(req.user.userId).select('following').lean();
        const myFollowingIds = (currentUser.following || []).map(id => id.toString());
        const targetFollowersIds = (user.followers || []).map(id => id.toString());
        const mutualIds = targetFollowersIds.filter(id => myFollowingIds.includes(id));
        
        const previewUsers = await User.find({ _id: { $in: mutualIds.slice(0, 3) } })
          .select('username avatarUrl')
          .lean();
          
        user.mutualConnections = {
          totalCount: mutualIds.length,
          previewUsers: previewUsers
        };
      } catch (err) {
        console.error("Error fetching mutuals:", err);
      }
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update Profile Details
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const { name, bio, gender, country, countryCode } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (gender !== undefined) updateData.gender = gender;
    if (country !== undefined) updateData.country = country;
    if (countryCode !== undefined) updateData.countryCode = countryCode;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Toggle Account Privacy
app.put('/api/users/privacy', authenticateToken, async (req, res) => {
  try {
    const { isPrivate } = req.body;
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { isPrivate: Boolean(isPrivate) } },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update all active stories belonging to this user
    await Story.updateMany(
      { user: req.user.userId },
      { $set: { isPrivate: Boolean(isPrivate) } }
    );

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating privacy:', error);
    res.status(500).json({ message: 'Server error updating privacy' });
  }
});

// Get User Connections (Followers & Following populated)
app.get('/api/users/connections', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('followers', 'username avatarUrl')
      .populate('following', 'username avatarUrl')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Combine unique users from both
    const connectionsMap = new Map();
    const addUsers = (arr) => {
      if (arr) arr.forEach(u => connectionsMap.set(u._id.toString(), u));
    };
    addUsers(user.followers);
    addUsers(user.following);
    
    res.json(Array.from(connectionsMap.values()));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching connections' });
  }
});

// Check Username Availability
app.get('/api/users/check-username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.query;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }
    const trimmedUsername = username.trim().toLowerCase();
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser && existingUser._id.toString() !== req.user.userId) {
      return res.json({ available: false });
    }
    res.json({ available: true });
  } catch (error) {
    res.status(500).json({ message: 'Error checking username' });
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
    if (!user.pastUsernames) user.pastUsernames = [];
    if (!user.pastUsernames.includes(user.username) && user.username !== trimmedUsername) {
      user.pastUsernames.push(user.username);
    }
    user.username = trimmedUsername;
    await user.save();

    // Generate new token with updated username
    const jwtToken = jwt.sign(
      { userId: user._id, username: user.username, uniqueId: user.uniqueId },
      process.env.JWT_SECRET || 'insta_jwt_secret_key_12345',
      { expiresIn: '7d' }
    );

    res.json({ message: 'Username updated successfully', token: jwtToken, username: user.username, pastUsernames: user.pastUsernames });
  } catch (error) {
    res.status(500).json({ message: 'Error updating username' });
  }
});

// Get Public Profile
app.get('/api/users/public_profile/:id', authenticateToken, async (req, res) => {
  try {
    let user = await User.findById(req.params.id).select('username uniqueId followers following friendRequests avatarUrl country countryCode age gender lastActive').lean();
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

    const globalStories = await Story.find({ user: user._id, visibility: { $in: ['global', 'everyone'] } })
      .populate('viewedBy', 'username avatarUrl')
      .populate('likedBy', 'username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    user.globalStories = globalStories;

    // Mutual Followers Logic
    if (req.user && req.user.userId && req.user.userId !== user._id.toString()) {
      try {
        const currentUser = await User.findById(req.user.userId).select('following').lean();
        const myFollowingIds = (currentUser.following || []).map(id => id.toString());
        const targetFollowersIds = (user.followers || []).map(id => id.toString());
        const mutualIds = targetFollowersIds.filter(id => myFollowingIds.includes(id));
        
        const previewUsers = await User.find({ _id: { $in: mutualIds.slice(0, 3) } })
          .select('username avatarUrl')
          .lean();
          
        user.mutualConnections = {
          totalCount: mutualIds.length,
          previewUsers: previewUsers
        };
      } catch (err) {
        console.error("Error fetching mutuals:", err);
      }
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public profile' });
  }
});

// Get Public Profile by Unique ID
app.get('/api/users/public_profile_by_uid/:uniqueId', authenticateToken, async (req, res) => {
  try {
    let user = await User.findOne({ uniqueId: req.params.uniqueId }).select('username uniqueId followers following friendRequests avatarUrl country countryCode age gender lastActive').lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.avatarUrl || user.avatarUrl.includes('randomuser.me') || user.avatarUrl.includes('iran.liara.run') || user.avatarUrl.includes('top=')) {
      user.avatarUrl = generateAvatarUrl(user.gender);
      await User.updateOne({ _id: user._id }, { $set: { avatarUrl: user.avatarUrl } });
    }

    const globalStories = await Story.find({ user: user._id, visibility: { $in: ['global', 'everyone'] } })
      .populate('viewedBy', 'username avatarUrl')
      .populate('likedBy', 'username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    user.globalStories = globalStories;

    // Mutual Followers Logic
    if (req.user && req.user.userId && req.user.userId !== user._id.toString()) {
      try {
        const currentUser = await User.findById(req.user.userId).select('following').lean();
        const myFollowingIds = (currentUser.following || []).map(id => id.toString());
        const targetFollowersIds = (user.followers || []).map(id => id.toString());
        const mutualIds = targetFollowersIds.filter(id => myFollowingIds.includes(id));
        
        const previewUsers = await User.find({ _id: { $in: mutualIds.slice(0, 3) } })
          .select('username avatarUrl')
          .lean();
          
        user.mutualConnections = {
          totalCount: mutualIds.length,
          previewUsers: previewUsers
        };
      } catch (err) {
        console.error("Error fetching mutuals:", err);
      }
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public profile' });
  }
});

// Get Paginated Global Stories for User
app.get('/api/users/:id/global_stories', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const globalStories = await Story.find({ user: req.params.id, visibility: { $in: ['global', 'everyone'] } })
      .populate('viewedBy', 'username avatarUrl')
      .populate('likedBy', 'username avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Story.countDocuments({ user: req.params.id, visibility: { $in: ['global', 'everyone'] } });

    res.json({
      stories: globalStories,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching global stories' });
  }
});

// Get Notifications (auto-migrates old friendRequests)
app.get('/api/users/notifications', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null; // _id of last notification

    const formatNotifications = (notifications) => notifications.map(notification => {
      const item = notification.toObject ? notification.toObject() : notification;
      const requestUser = item.user;
      const followBackRequested = Boolean(
        requestUser?.friendRequests?.some(id => id.toString() === req.user.userId)
      );

      if (requestUser) delete requestUser.friendRequests;
      return { ...item, followBackRequested };
    });

    const user = await User.findById(req.user.userId).populate('notifications.user', 'username uniqueId avatarUrl friendRequests');
    
    // Auto-migrate old friendRequests to notifications
    let migrated = false;
    for (let reqId of (user.friendRequests || [])) {
      const exists = user.notifications.some(n => n.user && n.user._id && n.user._id.toString() === reqId.toString());
      if (!exists) {
        user.notifications.push({ type: 'follow_request', user: reqId, createdAt: new Date(Date.now() - 10000) });
        migrated = true;
      }
    }

    if (migrated) {
      await user.save();
      const populatedUser = await User.findById(req.user.userId).populate('notifications.user', 'username uniqueId avatarUrl friendRequests');
      var sorted = populatedUser.notifications.sort((a, b) => b.createdAt - a.createdAt);
    } else {
      var sorted = user.notifications.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    const total = sorted.length;
    const totalUnread = sorted.filter(n => !n.read).length;

    // Find cursor position
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = sorted.findIndex(n => n._id.toString() === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const pageNotifs = sorted.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < total;
    const nextCursor = pageNotifs.length > 0 ? pageNotifs[pageNotifs.length - 1]._id : null;

    res.json({
      notifications: formatNotifications(pageNotifs),
      total,
      totalUnread,
      hasMore,
      nextCursor
    });
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

    // Check if already following or request already sent (make it idempotent so it doesn't throw 400 on double clicks)
    if (targetUser.followers.some(id => id && id.toString() === req.user.userId)) return res.json({ message: "Already following" });
    if (targetUser.friendRequests.some(id => id && id.toString() === req.user.userId)) return res.json({ message: "Request already sent" });

    const currentUser = await User.findById(req.user.userId);
    const isFollowBack = (currentUser.followers || []).some(id => id && id.toString() === targetUserId);
    const notifType = isFollowBack ? 'follow_back_request' : 'follow_request';

    // Clean up old notifications to prevent spam
    targetUser.notifications = (targetUser.notifications || []).filter(n => !(n.type === notifType && n.user && n.user.toString() === req.user.userId));
    
    targetUser.friendRequests = targetUser.friendRequests || [];
    targetUser.friendRequests.push(req.user.userId);
    targetUser.notifications.push({ type: notifType, user: req.user.userId });
    await targetUser.save();

    if (targetUser.ownedByAdmin) {
      io.to('admin_room').emit('admin_new_bot_request', {
        bot: { _id: targetUser._id, username: targetUser.username },
        requester: await User.findById(req.user.userId).select('username uniqueId avatarUrl')
      });
    }

    const targetSocketId = onlineUsers.get(targetUserId.toString(?.toString()));
    if (targetSocketId) {
      io.to(targetSocketId).emit('new_notification');
    }

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

    if (targetUserId.startsWith('ai-companion-')) {
      currentUser.coins -= 5;
      await currentUser.save();
      return res.json({ success: true, coinsLeft: currentUser.coins });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if ((targetUser.followers || []).some(id => id && id.toString() === req.user.userId)) return res.status(400).json({ message: "Already following" });
    if ((targetUser.friendRequests || []).some(id => id && id.toString() === req.user.userId)) return res.status(400).json({ message: "Request already sent" });

    // Deduct 5 coins
    currentUser.coins -= 5;
    await currentUser.save();

    // Clean up old notifications to prevent spam
    targetUser.notifications = (targetUser.notifications || []).filter(n => !(n.type === 'anonymous_follow_request' && n.user && n.user.toString() === req.user.userId));

    targetUser.friendRequests = targetUser.friendRequests || [];
    targetUser.friendRequests.push(req.user.userId);
    targetUser.notifications.push({ type: 'anonymous_follow_request', user: req.user.userId });
    await targetUser.save();

    if (targetUser.ownedByAdmin) {
      io.to('admin_room').emit('admin_new_bot_request', {
        bot: { _id: targetUser._id, username: targetUser.username },
        requester: currentUser
      });
    }

    const targetSocketId = onlineUsers.get(targetUserId.toString(?.toString()));
    if (targetSocketId) {
      io.to(targetSocketId).emit('new_notification');
    }

    res.json({ message: "Request sent successfully", coinsLeft: currentUser.coins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Error sending anonymous request' });
  }
});

// Accept Friend Request
app.post('/api/users/accept/:id', authenticateToken, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const currentUser = await User.findById(req.user.userId);
    
    // Remove from friendRequests so it doesn't stay pending forever
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
    
    // Change old request notifications to "started_following_you" so the user can follow back from the same notification
    if (currentUser.notifications) {
      currentUser.notifications.forEach(n => {
        if (['follow_request', 'anonymous_follow_request', 'follow_back_request'].includes(n.type) && n.user && n.user.toString() === requesterId) {
          n.type = 'started_following_you';
        }
      });
      currentUser.markModified('notifications');
    }

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
      const hadAnonymousRequest = (currentUser.notifications || []).some(n => n.type === 'anonymous_follow_request' && n.user && n.user.toString() === requesterId);
      const acceptType = hadAnonymousRequest ? 'anonymous_request_accepted' : 'request_accepted';
      
      requester.notifications = (requester.notifications || []).filter(n => !(n.type === acceptType && n.user && n.user.toString() === req.user.userId));
      requester.notifications.push({ type: acceptType, user: req.user.userId });
      await requester.save();
    }

    const reqSocketId = onlineUsers.get(requesterId.toString(?.toString()));
    if (reqSocketId) {
      io.to(reqSocketId).emit('new_notification');
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
    
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
    
    // Clean up old request notifications from current user
    currentUser.notifications = (currentUser.notifications || []).filter(n => 
      !(
        ['follow_request', 'anonymous_follow_request', 'follow_back_request'].includes(n.type) &&
        n.user && n.user.toString() === requesterId
      )
    );
    await currentUser.save();

    // Notify the requester that they were rejected
    const requester = await User.findById(requesterId);
    if (requester) {
      requester.notifications = (requester.notifications || []).filter(n => !(n.type === 'request_rejected' && n.user && n.user.toString() === req.user.userId));
      requester.notifications.push({ type: 'request_rejected', user: req.user.userId });
      await requester.save();
      
      const reqSocketId = onlineUsers.get(requesterId.toString(?.toString()));
      if (reqSocketId) {
        io.to(reqSocketId).emit('request_rejected_alert');
        io.to(reqSocketId).emit('new_notification');
      }
    }

    res.json({ message: "Request rejected" });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting request' });
  }
});

// Earn Coins Endpoints
app.post('/api/users/earn/ad', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    user.coins += 5; // Reward 5 coins for watching ad
    await user.save();
    
    res.json({ message: "Earned 5 coins for watching ad!", balance: user.coins });
  } catch(e) {
    res.status(500).json({ message: 'Error rewarding coins' });
  }
});

app.post('/api/users/earn/app', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    user.coins += 50; // Reward 50 coins for downloading app
    await user.save();
    
    res.json({ message: "Earned 50 coins for playing a game!", balance: user.coins });
  } catch(e) {
    res.status(500).json({ message: 'Error rewarding coins' });
  }
});


// Daily Reward Endpoint
app.post('/api/users/claim-daily', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    if (user.lastDailyReward) {
      const hoursSinceLastClaim = Math.abs(now - user.lastDailyReward) / 36e5;
      if (hoursSinceLastClaim < 24) {
        return res.status(200).json({ success: false, message: "You can only claim daily rewards once every 24 hours.", nextClaimInHours: 24 - hoursSinceLastClaim });
      }
    }

    user.coins += 3;
    user.lastDailyReward = now;
    await user.save();

    res.json({ message: "Claimed 3 daily coins!", balance: user.coins });
  } catch(e) {
    console.error(e);
    res.status(500).json({ message: 'Error claiming daily reward' });
  }
});

// Deduct Coins Endpoint
app.post('/api/users/deduct-coins', authenticateToken, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount" });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.coins < amount) {
      return res.status(400).json({ message: "Insufficient coins", balance: user.coins });
    }

    user.coins -= amount;
    await user.save();

    res.json({ message: `Successfully deducted ${amount} coins for ${reason || 'service'}`, balance: user.coins });
  } catch(e) {
    console.error(e);
    res.status(500).json({ message: 'Error deducting coins' });
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
      // Also remove follow requests and 'started_following_you' notifications to avoid dead notifications
      targetUser.notifications = targetUser.notifications.filter(n => !(
        ['follow_request', 'anonymous_follow_request', 'follow_back_request', 'started_following_you'].includes(n.type) && 
        n.user && n.user.toString() === currentUserId
      ));
      
      await currentUser.save();
      await targetUser.save();
      
      const targetSocketId = onlineUsers.get(targetUserId.toString(?.toString()));
      if (targetSocketId) {
        io.to(targetSocketId).emit('new_notification');
      }
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
// Web Push Subscription Endpoint for Users
app.post('/api/users/subscribe', authenticateToken, async (req, res) => {
  try {
    const subscription = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check if subscription already exists
    const exists = user.pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }
    res.status(201).json({ message: 'Subscription saved' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: 'Error saving subscription' });
  }
});

app.get('/api/users/connections/:id', authenticateToken, async (req, res) => {
  try {
    const type = req.query.type || 'followers'; // 'followers', 'following', or 'mutual'
    const cursor = req.query.cursor || null;
    const limit = parseInt(req.query.limit) || 20;

    const user = await User.findById(req.params.id).select('followers following isPrivate');
    if (!user) return res.status(404).json({ message: "User not found" });

    // Privacy check: only allow viewing if public, mutually connected, or viewing own profile
    const isOwnProfile = req.params.id === req.user.userId;
    const isFollowing = (user.followers || []).some(f => f && f.toString() === req.user.userId);

    if (user.isPrivate && !isOwnProfile && !isFollowing) {
      return res.status(403).json({ message: "This account is private" });
    }

    const search = req.query.search || '';

    // Get the full array of IDs for the requested type
    const allIds = (user[type] || []).filter(id => id != null);
    const total = allIds.length;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      let query = {
        _id: { $in: allIds },
        $or: [
          { username: searchRegex },
          { uniqueId: searchRegex }
        ]
      };

      if (cursor && cursor !== 'null') {
        query._id = { $in: allIds, $gt: cursor };
      }

      const matchedUsers = await User.find(query)
        .sort({ _id: 1 })
        .select('username uniqueId avatarUrl gender')
        .limit(limit)
        .lean();

      // Check if there are more results
      const totalMatches = await User.countDocuments({
        _id: { $in: allIds },
        $or: [
          { username: searchRegex },
          { uniqueId: searchRegex }
        ]
      });

      const hasMore = matchedUsers.length === limit;
      const nextCursor = matchedUsers.length > 0 ? matchedUsers[matchedUsers.length - 1]._id : null;

      return res.json({
        users: matchedUsers,
        total: totalMatches,
        hasMore,
        nextCursor
      });
    }

    // Find the cursor position in the array
    let startIndex = 0;
    if (cursor && cursor !== 'null') {
      const cursorIndex = allIds.findIndex(id => id.toString() === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    // Slice the IDs for this page
    const pageIds = allIds.slice(startIndex, startIndex + limit);

    // Populate only the sliced IDs
    const populatedUsers = await User.find({ _id: { $in: pageIds } })
      .select('username uniqueId avatarUrl gender')
      .lean();

    // Maintain the original order from the array
    const idOrder = pageIds.map(id => id.toString());
    const orderedUsers = idOrder.map(id => populatedUsers.find(u => u._id.toString() === id)).filter(Boolean);

    const hasMore = startIndex + limit < total;
    const nextCursor = orderedUsers.length > 0 ? orderedUsers[orderedUsers.length - 1]._id : null;

    res.json({
      users: orderedUsers,
      total,
      hasMore,
      nextCursor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching connections' });
  }
});


// Add Comment
app.post('/api/stories/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { text, parent_id } = req.body;
    if (!text || text.trim().length === 0) return res.status(400).json({ message: 'Comment cannot be empty' });
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    const newComment = new Comment({
      story_id: story._id,
      user_id: req.user.userId,
      text: text.trim(),
      parent_id: parent_id || null
    });
    await newComment.save();
    await Story.updateOne({ _id: story._id }, { $inc: { comment_count: 1 } });
    if (parent_id) {
      await Comment.updateOne({ _id: parent_id }, { $inc: { reply_count: 1 } });
      await redisService.updateCommentScore(story._id.toString(), parent_id, 2);
    } else {
      await redisService.addCommentToCache(story._id.toString(), newComment);
    }
    const commentUser = await User.findById(req.user.userId).select('username avatarUrl').lean();
    const populatedComment = newComment.toObject();
    populatedComment.user = commentUser;
    populatedComment.user_id = commentUser;
    
    // Broadcast to room
    io.to(`story_${story._id}`).emit('new_comment', populatedComment);
    
    res.json({ comment: populatedComment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', errorMsg: error.message, stack: error.stack });
  }
});

// Like/Unlike Comment
app.post('/api/stories/:id/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const userId = req.user.userId;
    const userObjId = new mongoose.Types.ObjectId(userId);

    const hasLiked = comment.liked_by && comment.liked_by.some(id => id.toString() === userId.toString());

    if (hasLiked) {
      comment.liked_by = comment.liked_by.filter(id => id.toString() !== userId.toString());
    } else {
      if (!comment.liked_by) comment.liked_by = [];
      comment.liked_by.push(userObjId);
    }
    
    // Ensure all existing strings are ObjectIds
    comment.liked_by = [...new Set(comment.liked_by.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
    comment.likes_count = comment.liked_by.length;

    await comment.save();

    const newLikesCount = comment.likes_count;
    const isLiked = !hasLiked;

    // Write-Through to Redis
    await redisService.updateCommentScore(req.params.id, comment._id.toString(), isLiked ? 1 : -1);

    // Broadcast to room
    io.to(`story_${req.params.id}`).emit('update_comment_like', {
      commentId: comment._id,
      likesCount: newLikesCount,
      senderId: userId,
      isLiked: isLiked,
      parentId: comment.parent_id
    });

    res.json({ success: true, likes_count: newLikesCount, isLiked: isLiked });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', errorMsg: error.message, stack: error.stack });
  }
});

// Delete Comment
app.delete('/api/stories/:id/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user_id.toString() !== req.user.userId && story.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    await Comment.deleteOne({ _id: comment._id });
    await Story.updateOne({ _id: story._id }, { $inc: { comment_count: -1 } });
    if (comment.parent_id) {
      await Comment.updateOne({ _id: comment.parent_id }, { $inc: { reply_count: -1 } });
    }
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Comments (Cache-First Read-Through with Cursor Pagination)
app.get('/api/stories/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { cursor, parent_id, limit = 20 } = req.query;
    const storyId = req.params.id;
    let comments = [];
    let has_more = false;
    let next_cursor = null;

    // We only use Redis ZSET for root comments (parent_id is null) without a cursor (first page)
    // Cursor pagination still relies on MongoDB for older comments.
    if (!parent_id && !cursor) {
      const topCommentIds = await redisService.getTopComments(storyId, parseInt(limit));
      
      if (topCommentIds && topCommentIds.length > 0) {
        // Cache Hit!
        const unsortedComments = await Comment.find({ _id: { $in: topCommentIds } })
          .populate('user_id', 'username avatarUrl')
          .lean();
        
        // Preserve ZSET order
        const map = new Map(unsortedComments.map(c => [c._id.toString(), c]));
        comments = topCommentIds.map(id => map.get(id)).filter(Boolean);
        
        if (comments.length === parseInt(limit)) {
          has_more = true;
          // next_cursor for ZSET is tricky, we fallback to timestamp for now
          next_cursor = comments[comments.length - 1].created_at;
        }
      } else {
        // Cache Miss! Fetch from DB
        comments = await Comment.find({ story_id: storyId, parent_id: null })
          .sort({ is_pinned: -1, created_at: -1 })
          .limit(parseInt(limit))
          .populate('user_id', 'username avatarUrl')
          .lean();
          
        // Warmup Redis Cache with all root comments for this story
        const allRootComments = await Comment.find({ story_id: storyId, parent_id: null }).lean();
        await redisService.warmupTopComments(storyId, allRootComments);
        
        has_more = comments.length === parseInt(limit);
        next_cursor = has_more ? comments[comments.length - 1].created_at : null;
      }
    } else {
      // Normal DB Cursor Pagination for replies or older pages
      const query = { story_id: storyId, parent_id: parent_id || null };
      if (cursor) query.created_at = { $lt: new Date(cursor) };
      
      comments = await Comment.find(query)
        .sort({ is_pinned: -1, created_at: -1 })
        .limit(parseInt(limit))
        .populate('user_id', 'username avatarUrl')
        .lean();
        
      has_more = comments.length === parseInt(limit);
      next_cursor = has_more ? comments[comments.length - 1].created_at : null;
    }

    const formattedComments = comments.map(c => ({
      ...c,
      user: c.user_id,
      _id: c._id,
      createdAt: c.created_at
    }));

    res.json({ comments: formattedComments, next_cursor, has_more });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single story by ID
app.get('/api/stories/:id', authenticateToken, async (req, res, next) => {
  try {
    const storyId = req.params.id;
    if (storyId === 'everyone') return next(); // Let the /everyone route handle it
    const requestedStory = await Story.findById(storyId);
    if (!requestedStory) return res.status(404).json({ message: 'Story not found' });
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let query = {};
    if (requestedStory.isAdminStory) {
      query = { isAdminStory: true, createdAt: { $gt: twentyFourHoursAgo } };
    } else {
      query = { user: requestedStory.user, createdAt: { $gt: twentyFourHoursAgo } };
    }

    let userStories = await Story.find(query)
      .populate('user', 'username avatarUrl avatar gender isOnline lastSeen uniqueId country countryCode')
      .populate('viewedBy', 'username avatarUrl')
      .populate('likedBy', 'username avatarUrl')
      .sort({ createdAt: 1 });

    let storyIndex = userStories.findIndex(s => s._id.toString() === storyId);
    
    // If the specific story isn't in the active list (e.g., > 24h old but still accessible via direct link)
    if (storyIndex === -1 && requestedStory) {
      const populatedReqStory = await Story.findById(storyId)
        .populate('user', 'username avatarUrl avatar gender isOnline lastSeen uniqueId country countryCode')
        .populate('viewedBy', 'username avatarUrl')
        .populate('likedBy', 'username avatarUrl');
      if (populatedReqStory) {
        userStories.push(populatedReqStory);
        userStories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        storyIndex = userStories.findIndex(s => s._id.toString() === storyId);
      }
    }
    
    // Construct user object for admin if needed
    let groupUser = null;
    if (requestedStory.isAdminStory) {
      groupUser = {
        _id: 'admin_twelo',
        username: 'TWELO',
        name: 'TWELO',
        avatarUrl: '/twelo-admin-logo.jpg',
        uniqueId: 'twelo_admin'
      };
    } else if (userStories.length > 0 && userStories[0].user) {
      groupUser = userStories[0].user;
    }

    res.json({ stories: userStories, storyIndex: storyIndex >= 0 ? storyIndex : 0, user: groupUser });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching story' });
  }
});

// Mark story as viewed
app.post('/api/stories/:id/view', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const storyId = req.params.id;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    
    // Don't count owner's own views
    if (story.isAdminStory || (story.user && story.user.toString() !== currentUserId)) {
      const updated = await Story.findOneAndUpdate(
        { _id: storyId, viewedBy: { $ne: currentUserId } },
        { $addToSet: { viewedBy: currentUserId } },
        { new: true }
      );
      
      if (updated) {
        // Notify the story owner
        if (story.isAdminStory) {
          io.emit('admin_story_interaction');
        } else if (story.user) {
          const ownerId = story.user.toString();
          const ownerSocketId = onlineUsers.get(ownerId?.toString());
          if (ownerSocketId) {
            io.to(ownerSocketId).emit('story_interaction');
          }
        }
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error marking story viewed' });
  }
});


// Profile Avatar Update Endpoint
app.post('/api/users/update_avatar', authenticateToken, async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ message: 'Avatar URL is required' });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { avatarUrl },
      { new: true }
    );
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });
    
    res.json({ message: 'Avatar updated successfully', avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ message: 'Server error updating avatar' });
  }
});

// --- Status/Story Routes ---

app.get('/api/clean-duplicate-views', async (req, res) => {
  try {
    const stories = await Story.find({});
    let fixedCount = 0;

    for (let story of stories) {
      let needsSave = false;
      
      if (story.viewedBy && story.viewedBy.length > 0) {
        const uniqueViews = [...new Set(story.viewedBy.map(id => id.toString()))];
        if (uniqueViews.length !== story.viewedBy.length) {
          story.viewedBy = uniqueViews;
          needsSave = true;
        }
      }
      
      if (story.likedBy && story.likedBy.length > 0) {
        const uniqueLikes = [...new Set(story.likedBy.map(id => id.toString()))];
        if (uniqueLikes.length !== story.likedBy.length) {
          story.likedBy = uniqueLikes;
          needsSave = true;
        }
      }

      if (needsSave) {
        await story.save();
        fixedCount++;
      }
    }

    res.json({ message: `Cleanup complete. Fixed ${fixedCount} stories with duplicate views/likes.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test-stories', async (req, res) => {
  try {
    const stories = await Story.find().sort({createdAt: -1}).limit(10).lean();
    res.json(stories);
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

// Create a new story
app.post('/api/stories', authenticateToken, async (req, res) => {
  try {
    const { mediaUrl, mediaType, visibility, allowedUsers, songUrl, song } = req.body;
    if (!mediaUrl) return res.status(400).json({ message: 'Media URL is required' });
    
    // Parse song if it's sent as stringified JSON
    const parsedSong = typeof song === 'string' ? JSON.parse(song) : (song || null);

    const creator = await User.findById(req.user.userId).select('isPrivate').lean();

    const newStory = new Story({
      user: req.user.userId,
      mediaUrl,
      mediaType: mediaType || 'image',
      visibility: visibility || 'everyone',
      allowedUsers: allowedUsers || [],
      songUrl: songUrl || parsedSong?.audioUrl || null,
      song: parsedSong,
      isPrivate: creator?.isPrivate || false
    });
    
    // Make all stories permanent in the DB (filter by 24h dynamically instead)
    newStory.expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
    
    await newStory.save();
    const storyUser = await User.findById(req.user.userId).select('username avatarUrl uniqueId').lean();
    const populatedStory = newStory.toObject();
    populatedStory.user = storyUser;
    
    // Emit socket event to notify all connected clients
    io.emit('new_story');
    
    res.status(201).json(populatedStory);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ message: 'Error creating story' });
  }
});

// Get stories from followed users and self
app.get('/api/stories', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const currentUser = await User.findById(currentUserId).select('following');
    
    if (!currentUser) return res.status(404).json({ message: 'User not found' });
    
    // Get stories of current user + users they follow + custom visible
    const followingIds = currentUser.following || [];
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const stories = await Story.find({
      createdAt: { $gt: twentyFourHoursAgo },
      $or: [
        { user: currentUserId }, // Self
        { user: { $in: followingIds }, visibility: 'followers' }, // Followers only
        { visibility: 'custom', allowedUsers: currentUserId } // Close friends
      ]
    })
      .populate('user', 'username avatarUrl uniqueId')
      .populate('viewedBy', 'username avatarUrl')
      .populate('likedBy', 'username avatarUrl')
      .sort({ createdAt: 1 })
      .lean();
      
    // Group stories by user
    const groupedStoriesMap = new Map();
    
    stories.forEach(story => {
      if (!story.user) return; // ignore if user was deleted
      const uId = story.user._id.toString();

      if (!groupedStoriesMap.has(uId)) {
        groupedStoriesMap.set(uId, {
          user: story.user,
          stories: [],
          isAdminStory: false
        });
      }
      groupedStoriesMap.get(uId).stories.push(story);
    });
    
    // Convert to array
    let groupedStories = Array.from(groupedStoriesMap.values());
    
    // Determine the latest story timestamp for each group, and whether they have any unseen stories
    groupedStories.forEach(group => {
      group.latestStoryTime = new Date(group.stories[group.stories.length - 1].createdAt).getTime();
      group.hasUnseen = group.stories.some(s => !s.viewedBy || !s.viewedBy.some(v => (v._id || v).toString() === currentUserId));
    });

    // Sort grouped stories
    groupedStories.sort((a, b) => {
      // 1. Current user always first
      const isACurrentUser = a.user._id.toString() === currentUserId;
      const isBCurrentUser = b.user._id.toString() === currentUserId;
      if (isACurrentUser) return -1;
      if (isBCurrentUser) return 1;

      // 2. Unseen stories next
      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;

      // 3. Finally, sort by latest story time (most recent first)
      return b.latestStoryTime - a.latestStoryTime;
    });

    // Clean up temporary fields before sending
    groupedStories.forEach(group => {
      delete group.latestStoryTime;
      delete group.hasUnseen;
    });
    
    res.json(groupedStories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ message: 'Error fetching stories' });
  }
});

// Get everyone stories
app.get('/api/stories/everyone', authenticateToken, async (req, res) => {
  try {
    const { cursor } = req.query;
    const currentUser = await User.findById(req.user.userId).select('following').lean();
    const followingIds = currentUser?.following || [];

    const query = {
      $and: [
        {
          $or: [
            { visibility: { $in: ['everyone', 'global'] } },
            { isAdminStory: true }
          ]
        },
        {
          $or: [
            { isPrivate: false },
            { isPrivate: { $exists: false } },
            { user: req.user.userId },
            { user: { $in: followingIds } },
            { isAdminStory: true }
          ]
        }
      ]
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    let stories = await Story.find(query)
      .populate('user', 'username avatarUrl uniqueId country countryCode')
      .populate('viewedBy', 'username avatarUrl')
      .populate('likedBy', 'username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const hasMore = stories.length === 50;
    const nextCursor = stories.length > 0 ? stories[stories.length - 1].createdAt : null;

    // Reverse to chronological order for grouping
    stories.reverse();

    // Group stories by user and 24-hour windows
    const groupedStoriesMap = new Map();
    const userGroupTracker = {};
    
    stories.forEach(story => {
      let uId;
      if (story.isAdminStory) {
        uId = 'admin_twelo';
        if (!story.user) {
          story.user = {
            _id: uId,
            username: 'TWELO',
            name: 'TWELO',
            avatarUrl: '/twelo-admin-logo.jpg',
            uniqueId: 'twelo_admin'
          };
        }
      } else {
        if (!story.user) return;
        uId = story.user._id.toString();
      }

      const storyTime = new Date(story.createdAt).getTime();

      if (!userGroupTracker[uId]) {
        userGroupTracker[uId] = { groupIndex: 0, groupStartTime: storyTime };
      } else {
        const timeDiff = storyTime - userGroupTracker[uId].groupStartTime;
        if (timeDiff > 24 * 60 * 60 * 1000) {
          // Exceeded 24 hours, start a new group
          userGroupTracker[uId].groupIndex++;
          userGroupTracker[uId].groupStartTime = storyTime;
        }
      }

      const mapKey = `${uId}_${userGroupTracker[uId].groupIndex}`;

      if (!groupedStoriesMap.has(mapKey)) {
        groupedStoriesMap.set(mapKey, {
          user: story.user,
          userId: uId,
          username: story.user.username,
          avatarUrl: story.user.avatarUrl,
          stories: [],
        });
      }
      groupedStoriesMap.get(mapKey).stories.push(story);
    });

    let groupedStoriesArray = Array.from(groupedStoriesMap.values());
    groupedStoriesArray.forEach(group => {
      group.latestStoryTime = new Date(group.stories[group.stories.length - 1].createdAt).getTime();
    });
    groupedStoriesArray.sort((a, b) => b.latestStoryTime - a.latestStoryTime);

    res.json({ data: groupedStoriesArray, nextCursor, hasMore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching everyone stories' });
  }
});

// Toggle like on a story
app.post('/api/stories/:id/like', authenticateToken, async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user.userId;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    
    const hasLiked = story.likedBy.some(id => id.toString() === userId.toString());
    let updated;
    if (hasLiked) {
      // Unlike
      updated = await Story.findByIdAndUpdate(storyId, { $pull: { likedBy: userId } }, { new: true });
    } else {
      // Like (Also ensure they are in viewedBy)
      updated = await Story.findByIdAndUpdate(storyId, { 
        $addToSet: { likedBy: userId, viewedBy: userId } 
      }, { new: true });
    }
    
    if (!hasLiked && updated) {
      // Notify the story owner only on like
      if (story.isAdminStory) {
        io.emit('admin_story_interaction');
      } else if (story.user) {
        const ownerId = story.user.toString();
        const ownerSocketId = onlineUsers.get(ownerId?.toString());
        if (ownerSocketId) {
          io.to(ownerSocketId).emit('story_interaction');
        }
      }
    }
    
    res.json({ likedBy: story.likedBy });
  } catch (error) {
    console.error('Error toggling story like:', error);
    res.status(500).json({ message: 'Error toggling story like' });
  }
});

// Delete a story
app.delete('/api/stories/:id', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    
    // Ensure the user owns the story or is admin (if we had admin auth here)
    if (story.user.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this story' });
    }
    
    await Story.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting story' });
  }
});

// Get Messages Route (with Cursor Pagination)
app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;
    const cursor = req.query.cursor; // expects an ObjectId string or empty
    const limit = parseInt(req.query.limit) || 20;

    // Mark messages sent by the other user to current user as viewed (Async in background)
    // Only update if it's the first fetch (no cursor) to avoid redundant DB calls
    // IMPORTANT: Skip view-once messages — they must only be marked viewed when explicitly opened by user
    if (!cursor || cursor === 'null' || cursor === 'undefined') {
      Message.updateMany(
        { sender: otherUserId, receiver: currentUserId, isViewed: false, isViewOnce: { $ne: true } },
        { $set: { isViewed: true, viewedAt: new Date() } }
      ).catch(err => console.log('Error updating view status', err));
    }

    const query = {
      $and: [
        {
          $or: [
            { sender: currentUserId, receiver: otherUserId },
            { sender: otherUserId, receiver: currentUserId }
          ]
        },
        { deletedBy: { $ne: currentUserId } }
      ]
    };

    if (cursor && cursor !== 'null' && cursor !== 'undefined') {
      query._id = { $lt: cursor };
    }

    const messages = await Message.find(query)
      .sort({ _id: -1 }) // Get newest first
      .limit(limit);
      
    const hasMore = messages.length === limit;
    const nextCursor = messages.length > 0 ? messages[messages.length - 1]._id : null;

    res.json({
      messages: messages.reverse(), // Reverse to have oldest first in UI
      hasMore,
      nextCursor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
});

// Delete Entire Chat Route
app.delete('/api/messages/chat/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;

    await Message.updateMany(
      {
        $or: [
          { sender: currentUserId, receiver: otherUserId },
          { sender: otherUserId, receiver: currentUserId }
        ],
        deletedBy: { $ne: currentUserId }
      },
      {
        $addToSet: { deletedBy: currentUserId } // Using $addToSet is safer than $push to avoid duplicates
      }
    );

    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting chat', error: error.message });
  }
});

// Get all chats for current user (recent conversations list)
app.get('/api/chats/recent', authenticateToken, async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user.userId);
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor || null; // ISO timestamp string of lastMessageAt
    
    // Fetch latest sent and received messages using index-friendly separate queries
    const [sentChats, receivedChats, unreadCounts] = await Promise.all([
      Message.aggregate([
        { $match: { sender: currentUserId, deletedBy: { $ne: currentUserId } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$receiver', lastMessageAt: { $first: '$createdAt' } } }
      ]),
      Message.aggregate([
        { $match: { receiver: currentUserId, deletedBy: { $ne: currentUserId } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$sender', lastMessageAt: { $first: '$createdAt' } } }
      ]),
      Message.aggregate([
        { $match: { receiver: currentUserId, isViewed: false, deletedBy: { $ne: currentUserId } } },
        { $group: { _id: '$sender', count: { $sum: 1 } } }
      ])
    ]);

    const chatMap = new Map();

    sentChats.forEach(chat => {
      chatMap.set(chat._id.toString(), {
        _id: chat._id,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: 0
      });
    });

    receivedChats.forEach(chat => {
      const idStr = chat._id.toString();
      const existing = chatMap.get(idStr);
      if (existing) {
        if (chat.lastMessageAt > existing.lastMessageAt) {
          existing.lastMessageAt = chat.lastMessageAt;
        }
      } else {
        chatMap.set(idStr, {
          _id: chat._id,
          lastMessageAt: chat.lastMessageAt,
          unreadCount: 0
        });
      }
    });

    unreadCounts.forEach(chat => {
      const idStr = chat._id.toString();
      const existing = chatMap.get(idStr);
      if (existing) {
        existing.unreadCount = chat.count;
      }
    });

    const combinedChats = Array.from(chatMap.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    const total = combinedChats.length;

    // Apply cursor-based pagination: find chats older than the cursor timestamp
    let startIndex = 0;
    if (cursor) {
      const cursorDate = new Date(cursor);
      startIndex = combinedChats.findIndex(c => c.lastMessageAt < cursorDate);
      if (startIndex === -1) startIndex = total; // cursor is older than all chats
    }

    const pageChats = combinedChats.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < total;

    const userIds = pageChats.map(c => c._id);
    const users = await User.find({ _id: { $in: userIds } }).select('username uniqueId avatarUrl gender').lean();
    const usersMap = new Map(users.map(u => [u._id.toString(), u]));

    const finalChats = pageChats.map(chat => {
      const u = usersMap.get(chat._id.toString());
      return {
        _id: chat._id,
        username: u ? u.username : 'Deleted Account',
        uniqueId: u && u.uniqueId ? u.uniqueId : 'none',
        avatarUrl: u && u.avatarUrl ? u.avatarUrl : '',
        gender: u ? u.gender : null,
        isDeleted: !u,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: chat.unreadCount
      };
    });

    finalChats.forEach(chat => {
      if (chat.avatarUrl && !chat.avatarUrl.includes('randomuser.me') && !chat.avatarUrl.includes('iran.liara.run') && !chat.avatarUrl.includes('top=')) return;
      if (!chat.gender) return;
      chat.avatarUrl = generateAvatarUrl(chat.gender);
      User.updateOne({ _id: chat._id }, { $set: { avatarUrl: chat.avatarUrl } }).catch(console.error);
    });

    const nextCursor = finalChats.length > 0 ? finalChats[finalChats.length - 1].lastMessageAt : null;

    res.json({
      chats: finalChats,
      total,
      hasMore,
      nextCursor
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent chats', error: error.message });
  }
});


// Socket.io Real-time Setup
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
  if (pass === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ message: 'Unauthorized Admin Access' });
  }
};

app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const allOnlineIds = Array.from(onlineUsers.keys());
    const validMongoIds = allOnlineIds.filter(id => /^[a-fA-F0-9]{24}$/.test(id));
    const realUsersCount = await User.countDocuments({ 
      _id: { $in: validMongoIds }, 
      ownedByAdmin: { $ne: true } 
    });
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramUsage = Math.round((usedMem / totalMem) * 100);
    const cpuLoad = Math.round((os.loadavg()[0] || 0) * 100) / 100;
    
    let dbStorageMB = 0;
    if (mongoose.connection.db) {
      const dbStats = await mongoose.connection.db.stats();
      dbStorageMB = Math.round((dbStats.dataSize || 0) / 1024 / 1024);
    }

    res.json({
      activeUsers: realUsersCount,
      randomRooms: activeRandomChats.size,
      queuedRandom: randomChatQueue.length,
      serverHealth: {
        ramUsage,
        cpuLoad,
        dbStorageMB
      }
    });
  } catch (err) {
    res.json({
      activeUsers: 0,
      randomRooms: activeRandomChats.size,
      queuedRandom: randomChatQueue.length,
      serverHealth: { ramUsage: 0, cpuLoad: 0, dbStorageMB: 0 }
    });
  }
});

// Advanced Analytics Endpoint
app.get('/api/admin/analytics', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run heavy distinct queries in parallel to significantly reduce loading time
    const [dauSessions, mauSessions] = await Promise.all([
      UserSession.distinct('user', { startTime: { $gte: startOfDay } }),
      UserSession.distinct('user', { startTime: { $gte: startOfMonth } })
    ]);
    
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSessions = await UserSession.find({ startTime: { $gte: sevenDaysAgo } }).lean();
    
    let totalDuration = 0;
    let totalMessages = 0;
    let totalMatches = 0;
    let sessionCount = recentSessions.length;
    
    // Add completed sessions
    recentSessions.forEach(s => {
      totalDuration += (s.durationMs || 0);
      totalMessages += (s.messagesSent || 0);
      totalMatches += (s.matchesMade || 0);
    });
    
    // Add CURRENT live active sessions so averages update in real-time before disconnect
    activeSessions.forEach((session) => {
       totalDuration += (Date.now() - session.startTime);
       totalMessages += (session.messagesSent || 0);
       totalMatches += (session.matchesMade || 0);
       sessionCount++;
    });
    
    const avgSessionMs = sessionCount ? totalDuration / sessionCount : 0;
    const avgMessages = sessionCount ? totalMessages / sessionCount : 0;
    const avgMatches = sessionCount ? totalMatches / sessionCount : 0;
    
    // Format chart data (Last 7 Days DAU trend) with Promise.all for speed
    const chartData = { labels: [], dau: [] };
    const chartPromises = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dEnd = new Date(dStart.getTime() + 24 * 60 * 60 * 1000);
      
      chartData.labels.push(`${d.getDate()}/${d.getMonth()+1}`);
      chartPromises.push(UserSession.distinct('user', { startTime: { $gte: dStart, $lt: dEnd } }));
    }
    
    const dailyDauResults = await Promise.all(chartPromises);
    dailyDauResults.forEach(res => chartData.dau.push(res.length));

    // Combine live active users into DAU/MAU to ensure it's up to second real-time
    const liveUserIds = Array.from(activeSessions.values()).map(s => s.userId?.toString()).filter(Boolean);
    const uniqueDau = new Set([...dauSessions.map(id => id.toString()), ...liveUserIds]);
    const uniqueMau = new Set([...mauSessions.map(id => id.toString()), ...liveUserIds]);

    const day1Retention = uniqueMau.size ? Math.round((uniqueDau.size / uniqueMau.size) * 100) : 0;

    // Fetch Growth Analytics (Last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const growthDataRaw = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);
    
    const growthData = { labels: [], signups: [] };
    let todaySignups = 0;
    let monthSignups = 0;
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      growthData.labels.push(`${d.getDate()}/${d.getMonth()+1}`);
      const found = growthDataRaw.find(g => g._id === dateStr);
      const count = found ? found.count : 0;
      growthData.signups.push(count);
      
      monthSignups += count;
      if (i === 0) todaySignups = count;
    }

    // Fetch Yearly Growth Analytics (Last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const yearlyGrowthDataRaw = await User.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    const yearlyGrowthData = { labels: [], signups: [] };
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let yearSignups = 0;
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const monthStr = `${d.getFullYear()}-${m < 10 ? '0' + m : m}`;
      yearlyGrowthData.labels.push(`${monthNames[d.getMonth()]} '${d.getFullYear().toString().slice(2)}`);
      
      const found = yearlyGrowthDataRaw.find(g => g._id === monthStr);
      const count = found ? found.count : 0;
      yearlyGrowthData.signups.push(count);
      yearSignups += count;
    }

    // Fetch Demographics Data
    const genderDataRaw = await User.aggregate([
      { $group: { _id: "$gender", count: { $sum: 1 } } }
    ]);
    const genderData = { male: 0, female: 0 };
    genderDataRaw.forEach(g => {
      if (g._id === 'male') genderData.male = g.count;
      if (g._id === 'female') genderData.female = g.count;
    });

    const countryDataRaw = await User.aggregate([
      { $group: { _id: "$country", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const countryData = { labels: [], counts: [] };
    countryDataRaw.forEach(c => {
      countryData.labels.push(c._id || 'Unknown');
      countryData.counts.push(c.count);
    });

    const demographics = { gender: genderData, country: countryData };

    // Fetch Peak Hours Heatmap (using Message collection)
    const peakHoursRaw = await Message.aggregate([
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);
    const peakHours = Array(24).fill(0);
    peakHoursRaw.forEach(hourData => {
      if (hourData._id != null) {
        // Adjust for IST (+5:30) approx + 5 hours for the chart to look accurate for India (since the user is Indian).
        let istHour = (hourData._id + 5) % 24;
        peakHours[istHour] += hourData.count;
      }
    });

    res.json({
      dau: uniqueDau.size,
      mau: uniqueMau.size,
      avgSessionMinutes: parseFloat((avgSessionMs / 60000).toFixed(2)),
      avgMessages: parseFloat(avgMessages.toFixed(2)),
      avgMatches: parseFloat(avgMatches.toFixed(2)),
      day1Retention: day1Retention,
      chartData,
      growthData,
      yearlyGrowthData,
      todaySignups,
      monthSignups,
      yearSignups,
      demographics,
      peakHours
    });

  } catch (err) {
    console.error("Analytics Error", err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.post('/api/admin/subscribe', adminAuth, async (req, res) => {
  try {
    const subscription = req.body;
    let adminData = await AdminData.findOne();
    if (!adminData) {
      adminData = new AdminData();
    }
    // Check if sub already exists to prevent duplicates
    const exists = adminData.pushSubscriptions.find(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      adminData.pushSubscriptions.push(subscription);
      await adminData.save();
    }
    res.status(201).json({ message: 'Subscribed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error subscribing' });
  }
});

// Globe Control APIs
app.post('/api/admin/globe', adminAuth, async (req, res) => {
  try {
    const { isEnabled, customMessage, enableAt } = req.body;
    let adminData = await AdminData.findOne();
    if (!adminData) adminData = new AdminData();
    
    adminData.globeStatus = { 
      isEnabled: isEnabled !== undefined ? isEnabled : adminData.globeStatus?.isEnabled, 
      customMessage: customMessage || adminData.globeStatus?.customMessage, 
      enableAt: enableAt !== undefined ? enableAt : adminData.globeStatus?.enableAt 
    };
    await adminData.save();
    cachedGlobeStatus = adminData.globeStatus;
    
    io.emit('globe_status_update', adminData.globeStatus);
    res.json(adminData.globeStatus);
  } catch (err) {
    console.error("Globe status error", err);
    res.status(500).json({ error: 'Failed to update globe status' });
  }
});

app.get('/api/config/globe', async (req, res) => {
  res.json(cachedGlobeStatus);
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
    const decryptedUsers = users.map(user => {
      const userObj = user.toObject();
      userObj.email = decryptEmail(userObj.email);
      return userObj;
    });
    res.json(decryptedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

app.post('/api/admin/bot-action', adminAuth, async (req, res) => {
  try {
    const { action, userId } = req.body;
    if (action === 'delete') {
      await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });
      await User.findByIdAndDelete(userId);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to perform bot action' });
  }
});

// --- Bot Training Admin APIs ---
app.get('/api/admin/bot-rules', adminAuth, async (req, res) => {
  try {
    const rules = await BotRule.find().sort({ createdAt: -1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

app.post('/api/admin/bot-rules', adminAuth, async (req, res) => {
  try {
    const newRule = new BotRule(req.body);
    await newRule.save();
    res.json(newRule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save rule' });
  }
});

app.delete('/api/admin/bot-rules/:id', adminAuth, async (req, res) => {
  try {
    await BotRule.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

app.put('/api/admin/bot-rules/:id', adminAuth, async (req, res) => {
  try {
    const updatedRule = await BotRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, rule: updatedRule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

app.post('/api/admin/block', adminAuth, async (req, res) => {
  try {
    const { userId, isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });
    if (isBlocked) {
      const socketId = onlineUsers.get(userId?.toString());
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
    const { message, alertType } = req.body;
    
    // Save to all users' notifications
    const newNotif = { type: 'system_alert', message, alertType: alertType || 'info', read: false };
    await User.updateMany({}, { $push: { notifications: newNotif } });

    // Emit to online users
    io.emit('new_notification');
    io.emit('system_alert_toast', { message, type: 'broadcast', alertType: alertType || 'info' });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error sending broadcast' });
  }
});

// Admin create a new story
app.post('/api/admin/stories', adminAuth, async (req, res) => {
  try {
    const { mediaUrl, mediaType, songUrl } = req.body;
    if (!mediaUrl) return res.status(400).json({ message: 'Media URL is required' });
    
    const newStory = new Story({
      isAdminStory: true,
      mediaUrl,
      mediaType: mediaType || 'image',
      visibility: 'everyone',
      songUrl: songUrl || null
    });
    
    await newStory.save();
    
    // Emit socket event to notify all connected clients
    io.emit('new_story');
    
    res.status(201).json(newStory);
  } catch (error) {
    console.error('Error creating admin story:', error);
    res.status(500).json({ message: 'Error creating admin story' });
  }
});

// Admin get all global stories
app.get('/api/admin/stories', adminAuth, async (req, res) => {
  try {
    const stories = await Story.find({ isAdminStory: true })
      .sort({ createdAt: -1 })
      .populate('viewedBy', 'username avatarUrl uniqueId name')
      .populate('likedBy', 'username avatarUrl uniqueId name');
    res.json(stories);
  } catch (error) {
    console.error('Error fetching admin stories:', error);
    res.status(500).json({ message: 'Error fetching stories' });
  }
});

// Admin delete a global story
app.delete('/api/admin/stories/:id', adminAuth, async (req, res) => {
  try {
    const story = await Story.findOneAndDelete({ _id: req.params.id, isAdminStory: true });
    if (!story) return res.status(404).json({ message: 'Story not found' });
    
    io.emit('story_deleted', { storyId: req.params.id });
    
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin story:', error);
    res.status(500).json({ message: 'Error deleting story' });
  }
});

app.post('/api/admin/notify-user', adminAuth, async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    const newNotif = { type: 'system_alert', message, read: false };
    await User.findByIdAndUpdate(userId, { $push: { notifications: newNotif } });

    const socketId = onlineUsers.get(userId?.toString());
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

    const socketId = onlineUsers.get(userId?.toString());
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

app.get('/api/admin/bots/requests', adminAuth, async (req, res) => {
  try {
    const bots = await User.find({ ownedByAdmin: true }).select('_id friendRequests username');
    let allRequests = [];
    for (let bot of bots) {
      if (bot.friendRequests && bot.friendRequests.length > 0) {
        const requesters = await User.find({ _id: { $in: bot.friendRequests } }).select('username uniqueId avatarUrl').lean();
        for (let rq of requesters) {
          allRequests.push({ bot: { _id: bot._id, username: bot.username }, requester: rq });
        }
      }
    }
    res.json(allRequests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bot requests' });
  }
});

app.post('/api/admin/bots/accept/:botId/:userId', adminAuth, async (req, res) => {
  try {
    const bot = await User.findById(req.params.botId);
    const user = await User.findById(req.params.userId);
    if (!bot || !user || !bot.ownedByAdmin) return res.status(404).json({ message: "Invalid request" });
    
    bot.friendRequests = bot.friendRequests.filter(id => id.toString() !== user._id.toString());
    if (!bot.followers.includes(user._id)) bot.followers.push(user._id);
    if (!user.following.includes(bot._id)) user.following.push(bot._id);
    
    user.notifications.push({ type: 'request_accepted', user: bot._id });
    
    await bot.save();
    await user.save();

    // Alert user that request was accepted
    const receiverSocketId = onlineUsers.get(user._id.toString(?.toString()));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('request_accepted_alert');
      io.to(receiverSocketId).emit('new_notification');
    }

    res.json({ message: "Bot request accepted" });
  } catch (error) {
    res.status(500).json({ message: 'Error accepting bot request' });
  }
});

app.get('/api/admin/bots/chats', adminAuth, async (req, res) => {
  try {
    const bots = await User.find({ ownedByAdmin: true }).populate('followers', 'username avatarUrl').lean();
    let result = [];
    
    bots.forEach(bot => {
      bot.followers.forEach(user => {
        result.push({ bot: bot, user: user });
      });
    });
    
    // Optional: filter out duplicates if needed, but since it's 1-to-1 bot-user friend relationship, it should be fine.
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bot chats' });
  }
});

app.get('/api/admin/bots/messages/:botId/:userId', adminAuth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.params.botId, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.params.botId }
      ]
    }).sort({ createdAt: 1 }).lean();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bot messages' });
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

// --- Country Facts Admin Routes ---
app.get('/api/admin/country-facts', adminAuth, async (req, res) => {
  try {
    const facts = await CountryFact.find().sort({ countryName: 1 });
    res.json(facts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching country facts', error: err.message });
  }
});

app.post('/api/admin/country-facts', adminAuth, async (req, res) => {
  try {
    const { countryCode, countryName, facts } = req.body;
    if (!countryCode || !countryName) return res.status(400).json({ message: 'Missing country code or name' });
    
    const uppercaseCode = countryCode.toUpperCase();
    let countryFact = await CountryFact.findOne({ countryCode: uppercaseCode });
    if (countryFact) {
      countryFact.countryName = countryName;
      countryFact.facts = facts || [];
      await countryFact.save();
    } else {
      countryFact = new CountryFact({ countryCode: uppercaseCode, countryName, facts: facts || [] });
      await countryFact.save();
    }
    res.json({ success: true, countryFact });
  } catch (err) {
    res.status(500).json({ message: 'Error saving country fact', error: err.message });
  }
});

app.delete('/api/admin/country-facts/:id', adminAuth, async (req, res) => {
  try {
    await CountryFact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting country fact', error: err.message });
  }
});

// Random Chat Queue
let randomChatQueue = []; // [{ userId, socketId, genderFilter, userGender }]
const activeRandomChats = new Map(); // roomId -> { user1, user2 }
const adminBusySockets = new Set(); // Track which admin sockets are currently intercepting
let lastGlobePushTime = 0; // Cooldown tracker for push notifications (5 min throttle)

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Register user online
  socket.on('register', async (userId) => {
    onlineUsers.set(userId?.toString(), socket.id);
    activeSessions.set(socket.id, { userId: userId?.toString(), startTime: Date.now(), messagesSent: 0, matchesMade: 0 });
    console.log(`User ${userId} registered with socket ${socket.id}`);
    io.emit('online_users', Array.from(onlineUsers.keys()));
    
    // Send globe status on connect
    try {
      if (cachedGlobeStatus) {
        socket.emit('globe_status_update', cachedGlobeStatus);
      }
    } catch (e) {}
  });

  // Story Comments Rooms
  socket.on('join_story_room', (storyId) => {
    socket.join(`story_${storyId}`);
  });
  
  socket.on('leave_story_room', (storyId) => {
    socket.leave(`story_${storyId}`);
  });

  // Handle incoming private message
  socket.on('send_message', async ({ tempId, senderId, receiverId, messageText, replyTo, messageType = 'text', fileUrl = null, isViewOnce = false }) => {
    try {
      if (activeSessions.has(socket.id)) {
        activeSessions.get(socket.id).messagesSent += 1;
      }
      
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

      const receiverSocketId = onlineUsers.get(receiverId?.toString());
      const senderSocketId = onlineUsers.get(senderId?.toString());

      const payload = {
        _id: message._id.toString(),
        sender: senderId.toString(),
        receiver: receiverId.toString(),
        message: messageText,
        replyTo: replyTo,
        messageType: messageType,
        fileUrl: fileUrl,
        isViewOnce: isViewOnce,
        isViewed: false,
        createdAt: message.createdAt
      };


      // Echo real message ID back to sender to update their UI
      io.to(socket.id).emit('message_sent', { tempId, message: payload });
      
      // Also echo to sender's OTHER devices/tabs
      if (senderSocketId && senderSocketId !== socket.id) {
        io.to(senderSocketId).emit('receive_message', payload);
      }

      // Check if they are mutual followers (friends) to send a push notification
      const senderObj = await User.findById(senderId).select('username avatarUrl followers following');
      const receiverObj = await User.findById(receiverId).select('pushSubscriptions followers following');
      
      // Enrich payload with sender info for rich toast
      payload.senderUsername = senderObj?.username || '';
      payload.senderAvatarUrl = senderObj?.avatarUrl || '';
      // Re-emit enriched payload
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('receive_message', payload);
      }
      
      if (senderObj && receiverObj) {
        // Only send push notifications when receiver is OFFLINE (not connected via socket)
        // When online, the in-app toast handles notifications
        const isReceiverOnline = !!receiverSocketId;
        const isMutual = senderObj.followers.some(id => id.toString() === receiverId.toString()) && 
                         senderObj.following.some(id => id.toString() === receiverId.toString());
        if (isMutual && !isReceiverOnline && !receiverObj.ownedByAdmin && receiverObj.pushSubscriptions && receiverObj.pushSubscriptions.length > 0) {
            const pushPayload = JSON.stringify({
              title: `New message from ${senderObj.username}`,
              body: messageType === 'text' ? messageText : `Sent a ${messageType}`,
              icon: '/icon-192.png',
              url: `/?chat=${senderId}`
            });
            const pushes = receiverObj.pushSubscriptions.map(async (sub) => {
              try {
                await webpush.sendNotification(sub, pushPayload);
              } catch (e) {
                if (e.statusCode === 410 || e.statusCode === 404) {
                  // Subscription is dead or no longer valid, remove it
                  await User.updateOne(
                    { _id: receiverObj._id },
                    { $pull: { pushSubscriptions: { endpoint: sub.endpoint } } }
                  );
                } else {
                  console.log('Push error:', e);
                }
              }
            });
            await Promise.all(pushes);
          }
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
          await Message.findByIdAndUpdate(messageId, { 
            $set: { isDeletedForEveryone: true, message: '🚫 This message was deleted', messageType: 'text', fileUrl: null } 
          });
          const receiverSocketId = onlineUsers.get(message.receiver.toString(?.toString()));
          const senderSocketId = onlineUsers.get(message.sender.toString(?.toString()));
          const payload = { messageId, type: 'everyone' };
          
          if (receiverSocketId) io.to(receiverSocketId).emit('message_deleted', payload);
          if (senderSocketId) io.to(senderSocketId).emit('message_deleted', payload);
        }
      } else if (type === 'me') {
        // Add to deletedBy array
        await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedBy: userId } });
        const socketId = onlineUsers.get(userId?.toString());
        if (socketId) io.to(socketId).emit('message_deleted', { messageId, type: 'me' });
      }
    } catch (error) {
      console.error(error);
    }
  });

  // --- Real-time Notifications ---
  socket.on('send_friend_request', ({ targetUserId }) => {
    const receiverSocketId = onlineUsers.get(targetUserId?.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new_notification');
    }
  });

  socket.on('accept_friend_request', ({ requesterId }) => {
    const receiverSocketId = onlineUsers.get(requesterId?.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('request_accepted_alert');
    }
  });

  socket.on('reject_friend_request', ({ requesterId }) => {
    const receiverSocketId = onlineUsers.get(requesterId?.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('request_rejected_alert');
    }
  });

  // --- WebRTC Audio/Video Call Events ---
  
  // Call User (Initiate call)
  socket.on('call_user', ({ userToCall, signalData, from, fromUsername, fromAvatar, isVideo }) => {
    const receiverSocketId = onlineUsers.get(userToCall.toString(?.toString()));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming_call', {
        signal: signalData,
        from,
        fromSocketId: socket.id,
        fromUsername,
        fromAvatar,
        isVideo
      });
    } else {
      // Receiver is not online — notify caller immediately ONLY on the initial offer
      if (signalData && signalData.type === 'offer') {
        socket.emit('call_failed', { reason: 'User is offline or unavailable' });
      }
    }
  });

  // Answer Call
  socket.on('answer_call', ({ to, toSocketId, signal }) => {
    // Prefer direct socket ID routing to handle multiple tabs/self-calling gracefully
    const callerSocketId = toSocketId || onlineUsers.get(to?.toString());
    console.log(`[answer_call] to: ${to}, callerSocketId: ${callerSocketId}`);
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', signal);
    } else {
      console.log(`[answer_call] FAIL! User ${to} not found in onlineUsers`);
    }
  });

  // Decline/End Call
  socket.on('end_call', ({ to, toSocketId }) => {
    const otherSocketId = toSocketId || onlineUsers.get(to?.toString());
    if (otherSocketId) {
      io.to(otherSocketId).emit('call_ended');
    }
  });

    // Handle chat theme change
    socket.on('change_chat_theme', async ({ targetUserId, themeId, senderId }) => {
      try {
        const userId = senderId;
        if (!userId) return;
        
        // Update both users symmetrically
        await User.findByIdAndUpdate(userId, { $set: { [`chatThemes.${targetUserId}`]: themeId } });
        await User.findByIdAndUpdate(targetUserId, { $set: { [`chatThemes.${userId}`]: themeId } });
        
        const senderObj = await User.findById(userId).select('username');
        
        // Broadcast theme change
        const payload = { themeId, setterId: userId, targetUserId };
        io.to(socket.id).emit('chat_theme_changed', payload);
        const receiverSocketId = onlineUsers.get(targetUserId?.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('chat_theme_changed', payload);
        }
        // Send to sender's other sockets
        const senderOtherSockets = onlineUsers.get(userId?.toString());
        if (senderOtherSockets && senderOtherSockets !== socket.id) {
           io.to(senderOtherSockets).emit('chat_theme_changed', payload);
        }

        // Generate system message
        const themeNames = { 'default': 'Default', 'whatsapp_light': 'Doodle Chat', 'romantic_love': 'Romantic Love', 'midnight_stars': 'Midnight Stars', 'cyberpunk': 'Cyberpunk Neon', 'cherry_blossom': 'Cherry Blossom', 'ocean_waves': 'Ocean Waves', 'sunset_vibes': 'Sunset Vibes', 'forest_leaves': 'Forest Leaves', 'coffee_shop': 'Coffee Shop', 'galaxy_nebula': 'Galaxy Nebula', 'minimal_dots': 'Minimalist Dots', 'retro_arcade': 'Retro Arcade', 'luxury_gold': 'Luxury Gold' };
        const tName = themeNames[themeId] || 'a new theme';
        const sysMessage = new Message({
          sender: userId,
          receiver: targetUserId,
          message: `${senderObj?.username || 'User'} changed the theme to ${tName}.`,
          messageType: 'system',
          isViewed: false
        });
        await sysMessage.save();
        
        const msgPayload = {
          _id: sysMessage._id.toString(),
          sender: userId.toString(),
          receiver: targetUserId.toString(),
          message: sysMessage.message,
          messageType: 'system',
          isViewed: false,
          createdAt: sysMessage.createdAt
        };
        
        io.to(socket.id).emit('receive_message', msgPayload);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receive_message', msgPayload);
        }
        
      } catch (err) {
        console.error("Theme change error:", err);
      }
    });

    socket.on('admin_online', async () => {
      socket.join('admin_room');
      const bots = await User.find({ ownedByAdmin: true }).select('_id');
      bots.forEach(bot => {
        onlineUsers.set(bot._id.toString(), socket.id);
      });
    });

    socket.on('admin_intercept_random', async ({ targetUserId }) => {
      const targetUserIndex = randomChatQueue.findIndex(u => u.userId === targetUserId);
      if (targetUserIndex !== -1) {
        adminBusySockets.add(socket.id);
        const targetUserSocket = randomChatQueue[targetUserIndex].socketId;
        randomChatQueue.splice(targetUserIndex, 1);
        
          const randomNames = ["Rahul", "Priya", "Aman", "Neha", "Rohan", "Sneha", "Karan", "Pooja", "Vikram", "Anjali", "Kabir", "Meera", "Aditya", "Riya", "Aryan", "Zara"];
          const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
          const randomSuffix = Math.floor(Math.random() * 900) + 100;
          
          const fakeUser = new User({
            name: randomName,
            username: `${randomName.toLowerCase()}${randomSuffix}`,
            email: `fake_${Date.now()}_${Math.floor(Math.random() * 1000)}@twelo.com`,
            googleId: `fake_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            uniqueId: Math.floor(Math.random() * 1000000000).toString(),
            avatarUrl: generateAvatarUrl(['male', 'female'][Math.floor(Math.random() * 2)]),
            ownedByAdmin: true
          });
        await fakeUser.save();
        
        onlineUsers.set(fakeUser._id.toString(), socket.id);
        
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        activeRandomChats.set(roomId, {
          user1: { userId: targetUserId, socketId: targetUserSocket },
          user2: { userId: fakeUser._id.toString(), socketId: socket.id }
        });
        
        const targetDbUser = await User.findById(targetUserId).select('username avatarUrl country countryCode gender').lean();
        
        const factData = await getRandomCountryFact('UN');
        io.to(targetUserSocket).emit('match_found', {
          roomId,
          partnerId: fakeUser._id.toString(),
          partnerAvatar: fakeUser.avatarUrl,
          partnerCountry: factData.countryName,
          partnerCountryCode: factData.countryCode,
          partnerFact: factData.fact
        });
        
        io.to(socket.id).emit('admin_intercept_started', {
          roomId,
          targetUser: targetDbUser,
          botAccount: fakeUser
        });
      }
    });

    // --- Anonymous Random Chat Events ---
    socket.on('search_random', async (payload) => {
      try {
        if (!cachedGlobeStatus.isEnabled) {
           const now = new Date();
           const enableTime = cachedGlobeStatus.enableAt ? new Date(cachedGlobeStatus.enableAt) : null;
           if (!enableTime || now < enableTime) {
               io.to(socket.id).emit('cancel_search');
               return; // Globe is offline, ignore search
           } else if (enableTime && now >= enableTime) {
               // Auto re-enable since timer passed
               cachedGlobeStatus.isEnabled = true;
               cachedGlobeStatus.enableAt = null;
               io.emit('globe_status_update', cachedGlobeStatus);
               AdminData.findOne().then(adminData => {
                   if(adminData) { adminData.globeStatus = cachedGlobeStatus; adminData.save(); }
               }).catch(e=>{});
           }
        }
      } catch (e) { console.error("Globe check error", e); }

      // Handle both old string payload and new object payload from updated clients
      const userId = typeof payload === 'string' ? payload : payload.userId;
      const isBotEligible = typeof payload === 'object' ? payload.isBotEligible : false;
      const genderFilter = typeof payload === 'object' ? (payload.genderFilter || 'any') : 'any';

      let userGender = 'male';
      let userCoins = 0;
      let targetDbUser = null;
      let userCountry = 'Earth';
      let userCountryCode = 'UN';
      try {
          const u = await User.findById(userId).select('gender coins username avatarUrl country countryCode').lean();
          if(u) {
             userGender = u.gender;
             userCoins = u.coins;
             userCountry = u.country || 'Earth';
             userCountryCode = u.countryCode || 'UN';
             targetDbUser = u;
          }
      } catch (err) {}

      if (genderFilter !== 'any' && userCoins < 2) {
        io.to(socket.id).emit('cancel_search');
        return;
      }

      if (!randomChatQueue.some(u => u.userId === userId)) {
        randomChatQueue.push({ userId, socketId: socket.id, genderFilter, userGender, userCountry, userCountryCode });
      }

      // 1. Check if there are ANY real users in the queue that match
      let matchedIndex = -1;
      const myIndex = randomChatQueue.findIndex(u => u.userId === userId);
      
      if (myIndex !== -1) {
        for (let i = 0; i < randomChatQueue.length; i++) {
           if (i === myIndex) continue;
           const potentialPartner = randomChatQueue[i];
           
           const myFilterMatches = genderFilter === 'any' || genderFilter === potentialPartner.userGender;
           const theirFilterMatches = potentialPartner.genderFilter === 'any' || potentialPartner.genderFilter === userGender;
           
           if (myFilterMatches && theirFilterMatches) {
               matchedIndex = i;
               break;
           }
        }
      }

      // If a real user is found, match them immediately
      if (matchedIndex !== -1) {
        const user2 = randomChatQueue[matchedIndex];
        // Splice higher index first to avoid shifting issues
        if (myIndex > matchedIndex) {
           randomChatQueue.splice(myIndex, 1);
           randomChatQueue.splice(matchedIndex, 1);
        } else {
           randomChatQueue.splice(matchedIndex, 1);
           randomChatQueue.splice(myIndex, 1);
        }
        
        const user1 = { userId, socketId: socket.id, genderFilter, userGender };
        
        // Deduct coins if filters were used
        try {
            if (user1.genderFilter !== 'any') {
                const dbU1 = await User.findById(user1.userId);
                if (dbU1 && dbU1.coins >= 2) {
                    dbU1.coins -= 2;
                    await dbU1.save();
                    io.to(user1.socketId).emit('coins_deducted', { amount: 2, balance: dbU1.coins });
                }
            }
            if (user2.genderFilter !== 'any') {
                const dbU2 = await User.findById(user2.userId);
                if (dbU2 && dbU2.coins >= 2) {
                    dbU2.coins -= 2;
                    await dbU2.save();
                    io.to(user2.socketId).emit('coins_deducted', { amount: 2, balance: dbU2.coins });
                }
            }
        } catch(e) { console.error("Coin deduction error", e); }
        
        const roomId = `random_${Date.now()}_${Math.random().toString(36).substring(2,8)}`;
        activeRandomChats.set(roomId, { user1, user2 });
        
        if (activeSessions.has(user1.socketId)) activeSessions.get(user1.socketId).matchesMade += 1;
        if (activeSessions.has(user2.socketId)) activeSessions.get(user2.socketId).matchesMade += 1;

        try {
          const user1Record = await User.findById(user1.userId);
          const user2Record = await User.findById(user2.userId);

          const factForUser1 = await getRandomCountryFact(user2Record?.countryCode || 'UN');
          const factForUser2 = await getRandomCountryFact(user1Record?.countryCode || 'UN');

          io.to(user1.socketId).emit('match_found', { 
            roomId, 
            partnerId: user2.userId,
            partnerAvatar: null, /* Anonymous by default */
            partnerCountry: (user2Record?.countryCode && user2Record.countryCode !== 'UN') ? user2Record.country : factForUser1.countryName,
            partnerCountryCode: (user2Record?.countryCode && user2Record.countryCode !== 'UN') ? user2Record.countryCode : factForUser1.countryCode,
            partnerFact: factForUser1.fact
          });
          io.to(user2.socketId).emit('match_found', { 
            roomId, 
            partnerId: user1.userId,
            partnerAvatar: null, /* Anonymous by default */
            partnerCountry: (user1Record?.countryCode && user1Record.countryCode !== 'UN') ? user1Record.country : factForUser2.countryName,
            partnerCountryCode: (user1Record?.countryCode && user1Record.countryCode !== 'UN') ? user1Record.countryCode : factForUser2.countryCode,
            partnerFact: factForUser2.fact
          });
        } catch (err) {
          console.error("Error fetching random chat users", err);
        }
        return; // Success, don't alert admin or use bot
      }

      // 2. No real users. Can we alert an Admin?
      const adminSockets = io.sockets.adapter.rooms.get('admin_room') || new Set();
      const availableAdmins = Array.from(adminSockets).filter(sid => !adminBusySockets.has(sid));

      // Push notifications disabled by admin preference

      if (availableAdmins.length > 0 && targetDbUser) {
        // Alert ALL available admins.
        availableAdmins.forEach(sid => io.to(sid).emit('admin_alert_new_random', targetDbUser));
      }

      // Keep the user in the queue briefly: a real match always takes
      // precedence. If nobody matched (and no admin intercepted), create a
      // clearly disclosed AI-companion room instead of leaving the user idle.
      setTimeout(async () => {
        const queuedUser = randomChatQueue.find(entry => entry.userId === userId && entry.socketId === socket.id);
        if (!queuedUser) return;

        randomChatQueue = randomChatQueue.filter(entry => !(entry.userId === userId && entry.socketId === socket.id));
        // Spoof location using queuedUser's country!
        // Bot gender follows user's gender filter (or opposite if no filter)
        const companion = createAiCompanion(userGender, queuedUser.userCountry, queuedUser.userCountryCode, queuedUser.genderFilter);
        const roomId = `ai_room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const chatData = {
          user1: queuedUser,
          user2: { userId: companion.id, socketId: null },
          isAiCompanion: true,
          companion
        };
        activeRandomChats.set(roomId, chatData);

        const factData = await getRandomCountryFact(queuedUser.userCountryCode);
        const finalCompanionCountry = factData.countryCode !== 'UN' ? factData.countryName : companion.country;
        const finalCompanionCode = factData.countryCode !== 'UN' ? factData.countryCode : companion.countryCode;

        // Deduct 2 coins if gender filter was applied
        if (queuedUser.genderFilter && queuedUser.genderFilter !== 'any') {
          try {
            const dbU = await User.findById(queuedUser.userId);
            if (dbU && dbU.coins >= 2) {
              dbU.coins -= 2;
              await dbU.save();
              io.to(queuedUser.socketId).emit('coins_deducted', { amount: 2, balance: dbU.coins });
            }
          } catch(e) {
            console.error('AI filter coin deduction error:', e);
          }
        }

        io.to(socket.id).emit('match_found', {
          roomId,
          partnerId: companion.id,
          partnerAvatar: companion.avatarUrl,
          partnerCountry: finalCompanionCountry,
          partnerCountryCode: finalCompanionCode, 
          partnerFact: factData.fact,
          partnerName: 'Stranger',
          isAiCompanion: true
        });
      }, AI_COMPANION_FALLBACK_DELAY_MS);
    });

  socket.on('cancel_search', (userId) => {
    randomChatQueue = randomChatQueue.filter(u => u.userId !== userId);
  });

  socket.on('send_anonymous_message', ({ roomId, messageText }) => {
    const chat = activeRandomChats.get(roomId);
    if (!chat) return;

    if (chat.isAiCompanion) {
      (async () => {
        const { reply, followUp, action } = await generateAiCompanionReply(chat, messageText, roomId);
        if (!activeRandomChats.has(roomId)) return;

        if (action === 'disconnect_immediately') {
          // Calculate read delay (roughly 150ms per 5 characters, min 1000ms, max 4000ms)
          const readDelay = Math.max(1000, Math.min(4000, ((messageText || '').length / 5) * 150));
          setTimeout(() => {
            if (!activeRandomChats.has(roomId)) return;
            activeRandomChats.delete(roomId);
            io.to(socket.id).emit('anonymous_chat_ended');
          }, readDelay + 2000);
          return;
        }

        const sendDelay = (text) => Math.max(1000, Math.min(6000, (text.length / 5) * 200));
        
        const executeAction = () => {
          if (action === 'disconnect') {
            setTimeout(() => {
               activeRandomChats.delete(roomId);
               io.to(socket.id).emit('anonymous_chat_ended');
            }, 2000);
          }
        };

        const typeAndSend = (text, callback) => {
          if (!text) {
            callback();
            return;
          }
          const typingDelay = sendDelay(text);
          setTimeout(() => {
            io.to(socket.id).emit('receive_anonymous_typing', { isTyping: true });
            setTimeout(() => {
              io.to(socket.id).emit('receive_anonymous_typing', { isTyping: false });
              if (!activeRandomChats.has(roomId)) return;
              
              io.to(socket.id).emit('receive_anonymous_message', {
                _id: `ai-companion-${Date.now()}-${Math.random().toString(36).substr(2,9)}`,
                message: text,
                senderSocket: 'ai-companion',
                createdAt: new Date().toISOString()
              });
              
              callback();
            }, typingDelay);
          }, 650);
        };

        // Calculate read delay (roughly 150ms per 5 characters, min 1000ms, max 4000ms)
        const readDelay = Math.max(1000, Math.min(4000, ((messageText || '').length / 5) * 150));

        setTimeout(() => {
          // First send the reply
          typeAndSend(reply, () => {
            // Then send the follow-up, if any
            if (followUp) {
              typeAndSend(followUp, executeAction);
            } else {
              executeAction();
            }
          });
        }, readDelay);

      })();
      return;
    }

    const senderSocketId = socket.id;
    const receiverSocketId = chat.user1.socketId === socket.id ? chat.user2.socketId : chat.user1.socketId;
    
    if (activeSessions.has(socket.id)) {
       activeSessions.get(socket.id).messagesSent += 1;
    }
    
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
    
    if (chat.isAiCompanion) {
      return;
    }

    const receiverSocketId = chat.user1.socketId === socket.id ? chat.user2.socketId : chat.user1.socketId;
    io.to(receiverSocketId).emit('receive_anonymous_typing', { isTyping });
  });

  socket.on('leave_anonymous_chat', ({ roomId }) => {
    const chat = activeRandomChats.get(roomId);
    if (chat) {
      if (chat.isAiCompanion) {
         // Mark session as ended in DB (keep data for analytics, don't delete)
         AiBotSession.findOneAndUpdate(
           { sessionId: roomId },
           { isActive: false, endedAt: new Date() }
         ).catch(e => console.error('AiBotSession end error:', e));
         activeRandomChats.delete(roomId);
         return;
      }
      
      if (chat.user1.socketId) adminBusySockets.delete(chat.user1.socketId);
      if (chat.user2.socketId) adminBusySockets.delete(chat.user2.socketId);
      adminBusySockets.delete(socket.id);

      const receiverSocketId = chat.user1.socketId === socket.id ? chat.user2.socketId : chat.user1.socketId;
      io.to(receiverSocketId).emit('anonymous_chat_ended');
      activeRandomChats.delete(roomId);
    }
  });

  // Handle user disconnect
  socket.on('mark_viewed', async ({ messageId, receiverId, senderId }) => {
    try {
      const now = new Date();
      const msg = await Message.findById(messageId);
      if (!msg) return;

      msg.isViewed = true;
      msg.viewedAt = now;
      await msg.save();

      if (!msg.isViewOnce) {
        // Mark all older regular messages from the same sender as viewed
        await Message.updateMany(
          { sender: senderId, receiver: receiverId, createdAt: { $lte: msg.createdAt }, isViewed: false, isViewOnce: { $ne: true } },
          { $set: { isViewed: true, viewedAt: now } }
        );
        // Emit messages_marked_read to update the entire chat state
        const senderSocketId = onlineUsers.get(senderId?.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_marked_read', { readerId: receiverId, viewedAt: now });
        }
        const receiverSocketId = onlineUsers.get(receiverId?.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('messages_marked_read', { readerId: receiverId, viewedAt: now });
        }
      } else {
        // For view-once, just update this specific message
        const senderSocketId = onlineUsers.get(senderId?.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_viewed', { messageId, receiverId, viewedAt: now });
        }
        const receiverSocketId = onlineUsers.get(receiverId?.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message_viewed', { messageId, receiverId, viewedAt: now });
        }
      }
    } catch (error) {
      console.error('Error marking viewed:', error);
    }
  });

  socket.on('mark_all_read', async ({ senderId, receiverId }) => {
    try {
      const now = new Date();
      await Message.updateMany(
        { sender: senderId, receiver: receiverId, isViewed: false, isViewOnce: { $ne: true } },
        { $set: { isViewed: true, viewedAt: now } }
      );
      // Notify the ORIGINAL SENDER that their messages were read (seen status)
      const senderSocketId = onlineUsers.get(senderId?.toString());
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages_marked_read', { readerId: receiverId, viewedAt: now });
      }
      // Also notify the RECEIVER's own socket so their chat list updates instantly
      const receiverSocketId = onlineUsers.get(receiverId?.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('messages_marked_read', { readerId: receiverId, viewedAt: now });
      }
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  });

  socket.on('typing_status', ({ senderId, receiverId, isTyping }) => {
    const receiverSocketId = onlineUsers.get(receiverId?.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing_status_received', { senderId, isTyping });
    }
  });

  socket.on('disconnect', () => {
    adminBusySockets.delete(socket.id);
    randomChatQueue = randomChatQueue.filter(u => u.socketId !== socket.id);
    
    for (const [roomId, chat] of activeRandomChats.entries()) {
      if (chat.user1.socketId === socket.id || chat.user2.socketId === socket.id) {
        const receiverSocketId = chat.user1.socketId === socket.id ? chat.user2.socketId : chat.user1.socketId;
        io.to(receiverSocketId).emit('anonymous_chat_ended');
        activeRandomChats.delete(roomId);
      }
    }

    for (let [userId, mappedSocketId] of onlineUsers.entries()) {
      if (mappedSocketId === socket.id) {
        onlineUsers.delete(userId);
        User.findByIdAndUpdate(userId, { lastActive: new Date() }).catch(e => console.error(e));
        console.log(`User ${userId} disconnected`);
      }
    }
    
    // Save session independently of whether the socket was still the "active" one in onlineUsers
    if (activeSessions.has(socket.id)) {
      const session = activeSessions.get(socket.id);
      const endTime = Date.now();
      const durationMs = endTime - session.startTime;
      
      if (durationMs > 1000) { // Only save if more than 1 second
        new UserSession({
           user: session.userId,
           startTime: new Date(session.startTime),
           endTime: new Date(endTime),
           durationMs,
           messagesSent: session.messagesSent,
           matchesMade: session.matchesMade
        }).save().catch(e => console.error("Error saving session", e));
      }
      activeSessions.delete(socket.id);
    }
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });
});

// Setup optimizations (compression, keepAlive, health API)
setupOptimizations(app, server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

setTimeout(async () => {
  try {
    const bots = await User.find({ ownedByAdmin: true }).select('_id');
    const botIds = bots.map(b => b._id);
    if (botIds.length > 0) {
      await User.updateMany({}, { $pull: { followers: { $in: botIds }, following: { $in: botIds }, friendRequests: { $in: botIds } } });
      await User.deleteMany({ ownedByAdmin: true });
      console.log('Cleaned up bots');
    }
  } catch(e) {}
}, 5000);

