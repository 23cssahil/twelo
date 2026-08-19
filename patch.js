const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');
const search = "app.post('/api/stories/:id/like', authenticateToken, async (req, res) => {";
const replacement = `// Toggle Add to Highlights
app.post('/api/stories/:id/highlight', authenticateToken, async (req, res) => {
  try {
    const storyId = req.params.id;
    const userId = req.user.userId;

    const story = await Story.findOne({ _id: storyId, user: userId });
    if (!story) {
      return res.status(404).json({ message: 'Story not found or unauthorized' });
    }

    const existingHighlight = await Highlight.findOne({ originalStoryId: storyId, user: userId });
    
    if (existingHighlight) {
      await Highlight.deleteOne({ _id: existingHighlight._id });
      res.json({ message: 'Removed from highlights', isHighlighted: false });
    } else {
      const highlight = new Highlight({
        user: userId,
        originalStoryId: storyId,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        song: story.song
      });
      await highlight.save();
      res.json({ message: 'Added to highlights', isHighlighted: true });
    }
  } catch (error) {
    console.error('Highlight error:', error);
    res.status(500).json({ message: 'Error toggling highlight' });
  }
});

` + search;

code = code.replace(search, replacement);
fs.writeFileSync('server/index.js', code);
