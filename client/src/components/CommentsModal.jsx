import React, { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, Loader2, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CommentItem = ({ comment, token, API_URL, onReply, storyId, isReply = false }) => {
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  
  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/stories/${storyId}/comments/${comment._id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    onMutate: async () => {
      setIsLiked(prev => !prev);
    }
  });

  const { data: repliesData, isLoading: isLoadingReplies } = useQuery({
    queryKey: ['comments', storyId, 'replies', comment._id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/stories/${storyId}/comments?parent_id=${comment._id}&limit=50`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      return res.json();
    },
    enabled: showReplies,
  });

  return (
    <div className={`flex gap-3 mb-4 items-start ${isReply ? 'ml-10 mt-2' : ''}`}>
      <img 
        src={comment.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user?.username}`} 
        className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gray-200 object-cover flex-shrink-0`} 
        alt=""
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900">{comment.user?.username}</span>
          <span className="text-xs text-gray-500">
            {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : ''}
          </span>
        </div>
        <p className="text-sm text-gray-800 break-words mt-0.5">
           {/* Basic mention highlight */}
           {comment.text.split(' ').map((word, i) => 
             word.startsWith('@') ? <span key={i} className="text-blue-600 font-medium">{word} </span> : word + ' '
           )}
        </p>
        
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-medium">
          <button 
            onClick={() => onReply(comment)} 
            className="hover:text-gray-900 transition-colors"
          >
            Reply
          </button>
          
          {!isReply && comment.reply_count > 0 && !showReplies && (
            <button 
              onClick={() => setShowReplies(true)}
              className="text-gray-900 transition-colors flex items-center gap-1"
            >
              <div className="w-6 h-[1px] bg-gray-300"></div>
              View {comment.reply_count} replies
            </button>
          )}
          {!isReply && showReplies && (
            <button 
              onClick={() => setShowReplies(false)}
              className="text-gray-900 transition-colors flex items-center gap-1"
            >
              <div className="w-6 h-[1px] bg-gray-300"></div>
              Hide replies
            </button>
          )}
        </div>

        {/* Nested Replies Rendering */}
        {showReplies && (
          <div className="mt-3">
             {isLoadingReplies ? (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                   <Loader2 size={12} className="animate-spin" /> Loading replies...
                </div>
             ) : (
                repliesData?.comments?.map(reply => (
                  <CommentItem 
                    key={reply._id} 
                    comment={reply} 
                    token={token} 
                    API_URL={API_URL} 
                    onReply={onReply} 
                    storyId={storyId} 
                    isReply={true} 
                  />
                ))
             )}
          </div>
        )}

      </div>
      
      <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
        <motion.button 
          whileTap={{ scale: 0.8 }}
          onClick={() => likeMutation.mutate()}
          className="text-gray-400"
        >
          <Heart size={14} fill={isLiked ? '#ef4444' : 'none'} color={isLiked ? '#ef4444' : 'currentColor'} />
        </motion.button>
        <span className="text-[10px] text-gray-500">{comment.likes_count + (isLiked ? 1 : 0)}</span>
      </div>
    </div>
  );
};

export default function CommentsModal({ story, isOpen, onClose, token, API_URL, updateCommentCount }) {
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const parentRef = useRef(null);
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['comments', story?._id],
    queryFn: async ({ pageParam = null }) => {
      let url = `${API_URL}/api/stories/${story._id}/comments?limit=20`;
      if (pageParam) url += `&cursor=${pageParam}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    enabled: !!story?._id && isOpen,
  });

  const flatComments = data?.pages.flatMap(page => page.comments) || [];

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? flatComments.length + 1 : flatComments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Increased estimate size because of potential replies
    overscan: 5,
  });

  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    if (!lastItem) return;
    if (lastItem.index >= flatComments.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage, flatComments.length, isFetchingNextPage, rowVirtualizer.getVirtualItems()]);

  // Handle setting reply focus
  useEffect(() => {
    if (replyingTo) {
      // Auto populate mention
      if (!commentInput.includes(`@${replyingTo.user?.username}`)) {
        setCommentInput(`@${replyingTo.user?.username} `);
      }
    }
  }, [replyingTo]);

  const postMutation = useMutation({
    mutationFn: async (text) => {
      // If we are replying to a reply, attach to its parent to keep it 1-level deep
      const parentId = replyingTo ? (replyingTo.parent_id || replyingTo._id) : null;
      const res = await fetch(`${API_URL}/api/stories/${story._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, parent_id: parentId })
      });
      return res.json();
    },
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: ['comments', story._id] });
      const previousComments = queryClient.getQueryData(['comments', story._id]);
      
      const newComment = {
        _id: Date.now().toString(),
        text,
        user: { username: 'You', avatarUrl: '' },
        createdAt: new Date().toISOString(),
        likes_count: 0,
        reply_count: 0,
        parent_id: replyingTo ? (replyingTo.parent_id || replyingTo._id) : null
      };

      if (!replyingTo) {
        // Root comment optimistic update
        queryClient.setQueryData(['comments', story._id], (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          newPages[0] = { ...newPages[0], comments: [newComment, ...newPages[0].comments] };
          return { ...old, pages: newPages };
        });
      } else {
        // Reply optimistic update (invalidate for simplicity so it fetches)
      }
      
      updateCommentCount(1);
      return { previousComments };
    },
    onError: (err, newComment, context) => {
      queryClient.setQueryData(['comments', story._id], context.previousComments);
      updateCommentCount(-1);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', story._id] });
      if (replyingTo) {
         queryClient.invalidateQueries({ queryKey: ['comments', story._id, 'replies', replyingTo.parent_id || replyingTo._id] });
      }
      setReplyingTo(null);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    postMutation.mutate(commentInput);
    setCommentInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 h-[80vh] bg-white rounded-t-2xl z-[60] flex flex-col shadow-2xl"
          >
            {/* Drag Handle */}
            <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
               <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-center w-full">Comments</h3>
            </div>

            {/* Comments List (Virtual) */}
            <div ref={parentRef} className="flex-1 overflow-y-auto px-4 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
              {status === 'pending' ? (
                <div className="space-y-6">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-2 mt-1">
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : status === 'error' ? (
                <div className="flex flex-col items-center justify-center h-full text-red-500">
                  <MessageCircle size={32} className="mb-2 opacity-50" />
                  <p>Error loading comments.</p>
                </div>
              ) : flatComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageCircle size={48} className="mb-3 opacity-20" />
                  <p className="font-medium text-gray-600">No comments yet</p>
                  <p className="text-sm">Be the first to start the conversation.</p>
                </div>
              ) : (
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const isLoaderRow = virtualRow.index > flatComments.length - 1;
                    const comment = flatComments[virtualRow.index];
                    
                    return (
                      <div
                        key={virtualRow.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {isLoaderRow ? (
                          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
                        ) : (
                          <CommentItem 
                            comment={comment} 
                            token={token} 
                            API_URL={API_URL} 
                            onReply={setReplyingTo}
                            storyId={story._id}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t border-gray-100 bg-white">
              <AnimatePresence>
                {replyingTo && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-between items-center bg-gray-50 p-2 rounded-t-lg text-xs text-gray-600 px-3 mb-1"
                  >
                    <span>Replying to <span className="font-semibold">{replyingTo.user?.username}</span></span>
                    <button type="button" onClick={() => {
                        setReplyingTo(null);
                        setCommentInput(commentInput.replace(`@${replyingTo.user?.username} `, ''));
                    }} className="hover:text-gray-900 bg-gray-200 p-0.5 rounded-full"><X size={12} /></button>
                  </motion.div>
                )}
              </AnimatePresence>
              <form onSubmit={handleSubmit} className="flex items-center gap-2 relative">
                <img 
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=You`} 
                  className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" 
                  alt=""
                />
                <input
                  type="text"
                  placeholder={replyingTo ? 'Add a reply...' : 'Add a comment...'}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 bg-gray-100 rounded-full py-2.5 px-4 pr-12 text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
                />
                <button 
                  type="submit" 
                  disabled={!commentInput.trim() || postMutation.isPending}
                  className="absolute right-2 p-1.5 bg-blue-500 text-white rounded-full disabled:opacity-50 transition-transform active:scale-95"
                >
                  {postMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
