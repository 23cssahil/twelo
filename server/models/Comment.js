const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  story_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Story', 
    required: true,
    index: true 
  },
  user_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  text: { 
    type: String, 
    required: true,
    trim: true,
    maxLength: 2200 // Instagram style limit
  },
  parent_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Comment', 
    default: null 
  },
  likes_count: { 
    type: Number, 
    default: 0 
  },
  reply_count: { 
    type: Number, 
    default: 0 
  },
  is_pinned: { 
    type: Boolean, 
    default: false 
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  }
});

/** 
 * ==========================================
 * HIGH-PERFORMANCE INDEXING (COMPOUND INDEXES)
 * ==========================================
 */

// 1. Fetching Top-Level Comments for a Story (Cursor-based Pagination)
// Sorts by is_pinned first (so pinned are at the top), then created_at (for cursor pagination)
commentSchema.index({ story_id: 1, parent_id: 1, is_pinned: -1, created_at: -1 });

// 2. Fetching Replies for a Specific Comment (Cursor-based Pagination)
// Quickly finds all replies for a specific parent comment, sorted by newest/oldest.
commentSchema.index({ parent_id: 1, created_at: 1 });

// 3. Optional: Fetching all comments made by a specific user (Profile activity)
commentSchema.index({ user_id: 1, created_at: -1 });

module.exports = mongoose.model('Comment', commentSchema);
