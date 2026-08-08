const axios = require('axios');
const FormData = require('form-data');

const nudityCheck = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
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
    
    console.log(`Sightengine Scores - Sexual Display: ${nudity.sexual_display}, Sexual Activity: ${nudity.sexual_activity}, Erotica: ${nudity.erotica}`);

    // Check strict moderation thresholds (Adjusted to avoid false positives on normal images)
    if (
      nudity.sexual_display > 0.50 || 
      nudity.sexual_activity > 0.50 || 
      nudity.erotica > 0.60
    ) {
      console.log('Image Blocked by Moderation');
      return res.status(400).json({
        success: false,
        message: 'Image blocked! Nudity or explicit content is strictly prohibited on Twelo.'
      });
    }

    // Image is safe, proceed
    next();
  } catch (err) {
    console.error('Sightengine AI Error:', err.response?.data || err.message);
    // If moderation API fails, block to be safe or pass. Blocking is safer.
    return res.status(500).json({ success: false, message: 'AI moderation check failed. Please try again.' });
  }
};

module.exports = { nudityCheck };
