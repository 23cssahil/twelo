const Redis = require('ioredis');

// Connect to Redis. Defaults to localhost for dev, or uses REDIS_URL from Render/Upstash
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

/**
 * Get Top Comments from Redis ZSET
 * @param {String} storyId 
 * @param {Number} limit 
 * @returns {Array} Array of Comment IDs
 */
const getTopComments = async (storyId, limit = 20) => {
  const key = `story:${storyId}:top_comments`;
  // ZREVRANGE fetches highest score first
  return await redis.zrevrange(key, 0, limit - 1);
};

/**
 * Increment or Decrement a Comment's Engagement Score in Redis
 * @param {String} storyId 
 * @param {String} commentId 
 * @param {Number} scoreIncrement (+1 for like, -1 for unlike, +2 for reply)
 */
const updateCommentScore = async (storyId, commentId, scoreIncrement) => {
  const key = `story:${storyId}:top_comments`;
  
  // Cache-Aside/Write-Through: Only update if the cache for this story already exists
  // We don't want to partially populate a cache. It should only be created by warmup.
  const exists = await redis.exists(key);
  if (exists) {
    await redis.zincrby(key, scoreIncrement, commentId);
  }
};

/**
 * Warmup Cache with data from MongoDB
 * @param {String} storyId 
 * @param {Array} comments Array of comment objects with their initial scores
 */
const warmupTopComments = async (storyId, comments) => {
  const key = `story:${storyId}:top_comments`;
  
  if (comments.length === 0) return;

  const multi = redis.multi();
  multi.del(key); // Clear existing just in case

  // Add each comment to ZSET with its Engagement Score
  // Engagement Score Formula: (likes * 1) + (replies * 2)
  comments.forEach(comment => {
    const score = (comment.likes_count * 1) + (comment.reply_count * 2);
    multi.zadd(key, score, comment._id.toString());
  });

  // Set TTL to 24 hours (86400 seconds) to save RAM on stale stories
  multi.expire(key, 86400);

  await multi.exec();
};

/**
 * Memory Optimization: Trim the ZSET to max 500 comments
 * @param {String} storyId 
 */
const trimTopComments = async (storyId) => {
  const key = `story:${storyId}:top_comments`;
  // ZREMRANGEBYRANK removes elements with rank (lowest score) from start to stop.
  // We want to keep the top 500, so we remove from 0 to -501.
  await redis.zremrangebyrank(key, 0, -501);
};

module.exports = {
  redis,
  getTopComments,
  updateCommentScore,
  warmupTopComments,
  trimTopComments
};
