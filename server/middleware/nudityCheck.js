const axios = require('axios');
const FormData = require('form-data');

const nudityCheck = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  // Bypass nudity check for audio messages
  if (req.file.mimetype && req.file.mimetype.startsWith('audio/')) {
    return next();
  }

  try {
    const data = new FormData();
    data.append('media', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    data.append('models', 'nudity-2.0');
    data.append('api_user', process.env.SIGHTENGINE_API_USER);
    data.append('api_secret', process.env.SIGHTENGINE_API_SECRET);

    const response = await axios({
      method: 'post',
      url: 'https://api.sightengine.com/1.0/check.json',
      data: data,
      headers: data.getHeaders()
    });

    const nudity = response.data.nudity;
    
    console.log('Sightengine Nudity Response:', JSON.stringify(nudity));

    let isNude = false;

    // Sightengine nudity-2.0 response format
    if (nudity.raw !== undefined) {
      if (nudity.raw > 0.25 || nudity.partial > 0.60) isNude = true;
    }
    
    // Fallback for fine-grained classes if format differs
    if (nudity.classes) {
      const explicit = nudity.classes.sexual_explicit || nudity.classes.sexual_activity || nudity.classes.sexual_display || 0;
      const suggestive = nudity.classes.suggestive || nudity.classes.erotica || 0;
      if (explicit > 0.25 || suggestive > 0.60) isNude = true;
    }
    
    // Fallback for old direct format
    if (nudity.sexual_display !== undefined || nudity.sexual_activity !== undefined) {
      if ((nudity.sexual_display || 0) > 0.25 || (nudity.sexual_activity || 0) > 0.25 || (nudity.erotica || 0) > 0.60) isNude = true;
    }

    // Foolproof catch-all: if 'safe' class exists and is less than 50%
    if (nudity.safe !== undefined && nudity.safe < 0.50) {
      isNude = true;
    }

    if (isNude) {
      console.log('Image Blocked by Moderation');
      return res.status(400).json({
        success: false,
        message: 'Image blocked! Nudity or explicit content is strictly prohibited on Twelo.',
        debug: nudity
      });
    }

    // Image is safe, proceed
    req.sightengineResponse = nudity;
    next();
  } catch (err) {
    console.error('Sightengine AI Error:', err.response?.data || err.message);
    // If moderation API fails, block to be safe or pass. Blocking is safer.
    return res.status(500).json({ success: false, message: 'AI moderation check failed. Please try again.', debugError: err.response?.data || err.message });
  }
};

module.exports = { nudityCheck };
