require('dotenv').config();
const Groq = require('groq-sdk');
const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
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
  const botName = chat.companion.name || 'Riya';
  const botGender = chat.companion.gender || 'female';
  const userId = chat.user1?.userId || 'unknown';

  const moods = [
    'You are very chill and give very short, lazy replies like "hmm", "ok", "sahi h".',
    'You are slightly energetic and use words like "bhai", "yaar" a lot.',
    'You are a bit sarcastic and like to give witty or funny short replies.',
    'You are very friendly and use a bit more emojis than usual.',
    'You are a bit shy and give direct, simple answers.',
    'You are curious and sometimes ask "kyu" or "kya hua" back.'
  ];
  
  // Deterministic mood and persona selection based on roomId so it stays consistent for this session
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) hash = (hash + roomId.charCodeAt(i)) % 1000;
  
  const botMood = moods[hash % moods.length];
  
  const locations = ['mumbai', 'pune', 'bangalore', 'jaipur', 'lucknow', 'chandigarh', 'indore', 'ahmedabad', 'bhopal', 'surat', 'nagpur', 'kanpur', 'patna', 'delhi', 'noida', 'gurgaon', 'dehradun', 'agra'];
  const occupations = ['bcom 2nd year me hu', 'bca kar rhi hu', 'btech 1st year', 'job karti hu IT me', 'ca ki tayari chal rhi hai', 'bsc nursing', 'ba final year', 'graphic designing ka course kar rhi hu', 'medical student hu', 'commerce student hu', 'engineering kar rha hu', 'startup me internship', 'freelancing', '12th pass ki hai abhi', 'neet ki preparation', 'law student hu'];
  
  const botLocation = locations[hash % locations.length];
  const botOccupation = occupations[hash % occupations.length];

  const systemPrompt = `You are ${botName}, a real ${botGender} Indian person in their early 20s using a random chat app on your phone.
${botMood}
You live in ${botLocation}. 
If asked what you do/study: say "${botOccupation}". Do NOT say "DU college" or "delhi" unless it's your assigned location/occupation.

STRICT RULES - follow these exactly:
- type in lowercase only. no capital letters.
- no punctuation marks at the end of sentences (!, ?, .)
- use short forms: nhi, kya, h, han, acha, yar, bhut, thk
- max 1 emoji per reply, often no emoji
- replies must be short: 2 to 10 words maximum.
- DO NOT say formal words like "namaste", "beta", "aapka", "kaisa hai". Use casual hinglish.
- DO NOT introduce yourself or say your age/location unless the user directly asks you.
- Give DIRECT, logical, and natural answers to whatever the user asks. Don't speak in riddles.
- VARY your responses! If the user says "acha", "hmm", "ok", DO NOT always reply "thk". Reply with "haan", "aur batao", "hm", "sahi h", or something else natural. Every chat should feel different.
- If user says something weird, confusing, or gibberish, VARY your confused reaction (e.g. "kya?", "samjhi nhi", "hein", "kya likh rhe ho", "kuch bhi", "hain?"). DO NOT keep repeating "kya bolu yaar".
- If user asks for number, instagram, snapchat, or social media: refuse casually and naturally (e.g., 'nhi yar', 'abhi nhi', 'mai nhi chalati', 'nahi deti kisi ko'). Vary your refusal. NEVER give fake numbers or IDs.
GREETINGS - when user says hi/hello/hey:
- just reply: "hi" or "heyy" or "hii" or "hey"

If user says something sexual, vulgar, or illegal:
- reply ONCE warning them casually (e.g. "kya bol rha h yar", "aisi batein mat karo", "bhai tameez se", "ye sab nhi", "kuch bhi bol rhe ho"). VARY your warning every time!
- next message after that warning: respond ONLY with: ACTION:DISCONNECT

Your name is ${botName}. Never change it.`;

  try {
    // Load existing session from DB
    let session = await AiBotSession.findOne({ sessionId: roomId });
    if (!session) {
      session = await AiBotSession.create({
        sessionId: roomId,
        userId,
        botName,
        botGender,
        userGender: chat.user1?.userGender || 'male',
        chatHistory: []
      });
    }

    // Build messages array for Groq (OpenAI format)
    const messages = [
      { role: 'system', content: systemPrompt },
      ...session.chatHistory.map(turn => ({
        role: turn.role === 'model' ? 'assistant' : 'user',
        content: turn.parts[0]?.text || ''
      })),
      { role: 'user', content: messageText }
    ];

    // Check if user is saying bye
    const textLower = messageText.toLowerCase().replace(/[^a-z]/g, '');
    if (textLower === 'bye' || textLower === 'byee' || textLower === 'okbye' || textLower === 'chalobye' || textLower === 'by') {
      const leaveMessages = ['bye yar', 'chalo bye', 'ok bye 👋', 'phir milte h', 'bye bye'];
      const leaveMsg = leaveMessages[Math.floor(Math.random() * leaveMessages.length)];
      session.chatHistory.push({ role: 'user', parts: [{ text: messageText }] });
      session.chatHistory.push({ role: 'model', parts: [{ text: leaveMsg }] });
      session.isActive = false;
      session.endedAt = new Date();
      await session.save();
      return { reply: leaveMsg, followUp: '', action: 'disconnect' };
    }

    // Call Groq API
    const completion = await groqClient.chat.completions.create({
      messages,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 100
    });

    const replyText = completion.choices[0]?.message?.content?.trim() || 'hmm';

    // Save user message to DB history
    session.chatHistory.push({ role: 'user', parts: [{ text: messageText }] });

    // Check for disconnect action
    if (replyText === 'ACTION:DISCONNECT' || replyText.includes('ACTION:DISCONNECT')) {
      const leaveMessages = ['bye', 'chalo bye', 'mujhe jana h', 'ok bye', 'phir baat karte h', 'bye bye'];
      const leaveMsg = leaveMessages[Math.floor(Math.random() * leaveMessages.length)];
      session.chatHistory.push({ role: 'model', parts: [{ text: leaveMsg }] });
      session.isActive = false;
      session.endedAt = new Date();
      await session.save();
      return { reply: leaveMsg, followUp: '', action: 'disconnect' };
    }

    // Save bot reply to DB history
    session.chatHistory.push({ role: 'model', parts: [{ text: replyText }] });
    await session.save();

    return { reply: replyText, followUp: '', action: 'continue' };

  } catch (error) {
    const isQuotaError = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('rate limit');
    if (isQuotaError) {
      console.warn('Groq quota exceeded — falling back to BotRule trained bot');
      return await generateBotRuleFallback(chat, messageText);
    }
    console.error('Groq AI error:', error?.message || error);
    return { reply: 'hmm... 😅', followUp: '', action: 'continue' };
  }
}


const User = require('./models/User');
const DeletedUser = require('./models/DeletedUser');
const Message = require('./models/Message');
const Report = require('./models/Report');
const AdminData = require('./models/AdminData');
const BotRule = require('./models/BotRule');
const UserSession = require('./models/UserSession');
const CountryFact = require('./models/CountryFact');

const app = express();

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
});

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

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
let cachedGlobeStatus = { isEnabled: true, customMessage: 'Globe is currently offline.', enableAt: null };

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://23cssahil_db_user:xsBXlihiFfWrsEZY@cluster0.pmn7via.mongodb.net/twelo_db?retryWrites=true&w=majority&appName=Cluster0')
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
      avatarUrl 
    });
    await newUser.save();

    if (referredBy) {
      try {
        const referrer = await User.findById(referredBy);
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!query) return res.json({ users: [], hasMore: false });

    const skip = (page - 1) * limit;
    
    // Prefix regex to enable MongoDB Index Seek on B-Tree index
    // Escape regex control characters to prevent invalid regex errors
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexQuery = new RegExp('^' + escapedQuery, 'i');

    const filter = {
      $or: [
        { username: regexQuery },
        { uniqueId: regexQuery }
      ]
    };

    const users = await User.find(filter)
      .skip(skip)
      .limit(limit + 1)
      .select('username uniqueId avatarUrl friendRequests followers');
      
    const hasMore = users.length > limit;
    if (hasMore) users.pop();

    res.json({ users, hasMore });
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
    const user = await User.findById(req.user.userId).populate('searchHistory', 'username uniqueId avatarUrl gender friendRequests followers');
    res.json(user.searchHistory.filter(u => u != null));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching search history' });
  }
});

app.delete('/api/users/search-history/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const targetId = req.params.id;
    user.searchHistory = user.searchHistory.filter(id => id && id.toString() !== targetId);
    await user.save();
    res.json({ message: 'Removed from search history' });
  } catch (error) {
    console.error(error);
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
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching public profile' });
  }
});

// Get Notifications (auto-migrates old friendRequests)
app.get('/api/users/notifications', authenticateToken, async (req, res) => {
  try {
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
      const populatedUser = await User.findById(req.user.userId).populate('notifications.user', 'username uniqueId avatarUrl friendRequests');
      const sorted = populatedUser.notifications.sort((a, b) => b.createdAt - a.createdAt);
      return res.json(formatNotifications(sorted));
    }
    
    const sorted = user.notifications.sort((a, b) => b.createdAt - a.createdAt);
    res.json(formatNotifications(sorted));
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
    if (targetUser.followers.some(id => id.toString() === req.user.userId)) return res.status(400).json({ message: "Already following" });
    if (targetUser.friendRequests.some(id => id.toString() === req.user.userId)) return res.status(400).json({ message: "Request already sent" });

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
    
    // Clean up old request notifications from current user so they don't reappear
    currentUser.notifications = (currentUser.notifications || []).filter(n => 
      !(
        ['follow_request', 'anonymous_follow_request', 'follow_back_request'].includes(n.type) &&
        n.user && n.user.toString() === requesterId
      )
    );

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
      // Also remove follow_request notification to avoid spam when someone cancels a request
      targetUser.notifications = targetUser.notifications.filter(n => !(n.type === 'follow_request' && n.user && n.user.toString() === currentUserId));
      
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
      .populate('followers', 'username uniqueId avatarUrl gender')
      .populate('following', 'username uniqueId avatarUrl gender');
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Privacy check: only allow viewing if mutually connected or viewing own profile
    const isOwnProfile = req.params.id === req.user.userId;
    const isFollowing = user.followers.some(f => f && f._id && f._id.toString() === req.user.userId);
    
    if (!isOwnProfile && !isFollowing) {
      return res.status(403).json({ message: "Not authorized to view connections" });
    }

    res.json({ 
      followers: user.followers.filter(u => u != null), 
      following: user.following.filter(u => u != null) 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching connections' });
  }
});

// Get Messages Route (with Pagination)
app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Mark messages sent by the other user to current user as viewed (Async in background)
    // Only update if it's the first page (latest messages) to avoid redundant DB calls on older pages
    if (page === 1) {
      Message.updateMany(
        { sender: otherUserId, receiver: currentUserId, isViewed: false },
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

    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Get newest first
      .skip(skip)
      .limit(limit);
      
    const totalMessages = await Message.countDocuments(query);
    const hasMore = totalMessages > (skip + messages.length);

    // Reverse the array so the frontend receives them in chronological order
    const chronologicalMessages = messages.reverse();

    res.json({
      messages: chronologicalMessages,
      hasMore: hasMore
    });
  } catch (error) {
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
    const chats = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: currentUserId }, { receiver: currentUserId }],
          deletedBy: { $ne: currentUserId }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', currentUserId] }, '$receiver', '$sender']
          },
          lastMessageAt: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', currentUserId] },
                    { $eq: ['$isViewed', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          username: { $ifNull: ['$user.username', 'Deleted Account'] },
          uniqueId: { $ifNull: ['$user.uniqueId', 'none'] },
          avatarUrl: { $ifNull: ['$user.avatarUrl', ''] },
          gender: '$user.gender',
          isDeleted: { $eq: ['$user._id', null] },
          lastMessageAt: 1,
          unreadCount: 1
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]).allowDiskUse(true);

    chats.forEach(chat => {
      if (chat.avatarUrl && !chat.avatarUrl.includes('randomuser.me') && !chat.avatarUrl.includes('iran.liara.run') && !chat.avatarUrl.includes('top=')) return;
      if (!chat.gender) return;
      chat.avatarUrl = generateAvatarUrl(chat.gender);
      User.updateOne({ _id: chat._id }, { $set: { avatarUrl: chat.avatarUrl } }).catch(console.error);
    });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent chats', error: error.message });
  }
});


// Socket.io Real-time Setup
const onlineUsers = new Map();
const activeSessions = new Map(); // socket.id -> { userId, startTime, messagesSent, matchesMade }
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
    const receiverSocketId = onlineUsers.get(user._id.toString());
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

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Register user online
  socket.on('register', async (userId) => {
    onlineUsers.set(userId, socket.id);
    activeSessions.set(socket.id, { userId: userId, startTime: Date.now(), messagesSent: 0, matchesMade: 0 });
    console.log(`User ${userId} registered with socket ${socket.id}`);
    io.emit('online_users', Array.from(onlineUsers.keys()));
    
    // Send globe status on connect
    try {
      if (cachedGlobeStatus) {
        socket.emit('globe_status_update', cachedGlobeStatus);
      }
    } catch (e) {}
  });

  // Handle incoming private message
  socket.on('send_message', async ({ senderId, receiverId, messageText, replyTo, messageType = 'text', fileUrl = null, isViewOnce = false }) => {
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
          await Message.findByIdAndUpdate(messageId, { 
            $set: { isDeletedForEveryone: true, message: '🚫 This message was deleted', messageType: 'text', fileUrl: null } 
          });
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
            partnerAvatar: user2Record?.avatarUrl,
            partnerCountry: (user2Record?.countryCode && user2Record.countryCode !== 'UN') ? user2Record.country : factForUser1.countryName,
            partnerCountryCode: factForUser1.countryCode,
            partnerFact: factForUser1.fact
          });
          io.to(user2.socketId).emit('match_found', { 
            roomId, 
            partnerId: user1.userId,
            partnerAvatar: user1Record?.avatarUrl,
            partnerCountry: (user1Record?.countryCode && user1Record.countryCode !== 'UN') ? user1Record.country : factForUser2.countryName,
            partnerCountryCode: factForUser2.countryCode,
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

      // Always send web push notification if we have subscriptions, regardless of active sockets
      (async () => {
        try {
          const adminData = await AdminData.findOne();
          if (adminData && adminData.pushSubscriptions && adminData.pushSubscriptions.length > 0) {
            const payload = JSON.stringify({
              title: 'Globe Touched!',
              body: `A new user is looking for a chat. Intercept now!`,
              icon: '/icon-192.png'
            });
            const pushes = adminData.pushSubscriptions.map(sub => webpush.sendNotification(sub, payload).catch(e => console.log('Push error:', e)));
            await Promise.all(pushes);
          }
        } catch (e) { console.error('Error sending push', e); }
      })();

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
        activeRandomChats.set(roomId, {
          user1: queuedUser,
          user2: { userId: companion.id, socketId: null },
          isAiCompanion: true,
          companion
        });

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
    if (chat.isAiCompanion) return;

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
      await Message.findByIdAndUpdate(messageId, { isViewed: true, viewedAt: now });
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message_viewed', { messageId, receiverId, viewedAt: now });
      }
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message_viewed', { messageId, receiverId, viewedAt: now });
      }
    } catch (error) {
      console.error('Error marking viewed:', error);
    }
  });

  socket.on('mark_all_read', async ({ senderId, receiverId }) => {
    try {
      const now = new Date();
      await Message.updateMany(
        { sender: senderId, receiver: receiverId, isViewed: false },
        { $set: { isViewed: true, viewedAt: now } }
      );
      const senderSocketId = onlineUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages_marked_read', { readerId: receiverId, viewedAt: now });
      }
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  });

  socket.on('typing_status', ({ senderId, receiverId, isTyping }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
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
