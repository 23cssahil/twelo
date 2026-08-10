import React, { useState, useRef, useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, Loader2, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SocketContext } from '../App';
import { useContext } from 'react';

const CommentItem = ({ comment, token, user, API_URL, onReply, storyId, isReply = false }) => {
  const queryClient = useQueryClient();
  const [likeData, setLikeData] = useState({
    isLiked: comment.liked_by && comment.liked_by.includes(user?.id || user?._id),
    count: comment.likes_count || 0
  });
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
      setLikeData(prev => ({
        isLiked: !prev.isLiked,
        count: prev.count + (!prev.isLiked ? 1 : -1)
      }));
    },
    onSuccess: (data) => {
      if (data.success) {
        setLikeData({ isLiked: data.isLiked, count: data.likes_count });
        
        const updateCache = (old) => {
          if (!old) return old;
          const uid = user?.id || user?._id;
          
          if (old.pages) {
            return {
              ...old,
              pages: old.pages.map(page => ({
                ...page,
                comments: page.comments.map(c => {
                  if (c._id === comment._id) {
                    const newLikedBy = data.isLiked 
                      ? Array.from(new Set([...(c.liked_by || []), uid]))
                      : (c.liked_by || []).filter(id => id !== uid);
                    return { ...c, likes_count: data.likes_count, liked_by: newLikedBy };
                  }
                  return c;
                })
              }))
            };
          }
          if (old.comments) {
             return {
               ...old,
               comments: old.comments.map(c => {
                 if (c._id === comment._id) {
                    const newLikedBy = data.isLiked 
                      ? Array.from(new Set([...(c.liked_by || []), uid]))
                      : (c.liked_by || []).filter(id => id !== uid);
                   return { ...c, likes_count: data.likes_count, liked_by: newLikedBy };
                 }
                 return c;
               })
             };
          }
          return old;
        };

        if (isReply) {
          queryClient.setQueryData(['comments', storyId, 'replies', comment.parent_id], updateCache);
        } else {
          queryClient.setQueryData(['comments', storyId], updateCache);
        }
      }
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
    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-start', marginLeft: isReply ? '40px' : '0', marginTop: isReply ? '8px' : '0' }}>
      <img 
        src={comment.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user?.username}`} 
        style={{ width: isReply ? '24px' : '32px', height: isReply ? '24px' : '32px', borderRadius: '50%', backgroundColor: '#eee', objectFit: 'cover', flexShrink: 0 }} 
        alt=""
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '600', fontSize: '14px', color: '#111' }}>{comment.user?.username}</span>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {(comment.created_at || comment.createdAt) ? formatDistanceToNow(new Date(comment.created_at || comment.createdAt), { addSuffix: true }) : ''}
          </span>
        </div>
        <p style={{ fontSize: '14px', color: '#333', wordBreak: 'break-word', marginTop: '2px', marginBottom: '0' }}>
           {comment.text?.split(' ').map((word, i) => 
             word.startsWith('@') ? <span key={i} style={{ color: '#2563eb', fontWeight: '500' }}>{word} </span> : word + ' '
           )}
        </p>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#888', fontWeight: '500' }}>
          <button 
            onClick={() => !comment.isOptimistic && onReply(comment)} 
            style={{ background: 'none', border: 'none', color: comment.isOptimistic ? '#ddd' : '#888', cursor: comment.isOptimistic ? 'default' : 'pointer', padding: 0 }}
            disabled={comment.isOptimistic || likeMutation.isPending}
          >
            Reply
          </button>
          
          {!isReply && comment.reply_count > 0 && !showReplies && (
            <button 
              onClick={() => setShowReplies(true)}
              style={{ background: 'none', border: 'none', color: '#111', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <div style={{ width: '24px', height: '1px', backgroundColor: '#ddd' }}></div>
              View {comment.reply_count} replies
            </button>
          )}
          {!isReply && showReplies && (
            <button 
              onClick={() => setShowReplies(false)}
              style={{ background: 'none', border: 'none', color: '#111', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <div style={{ width: '24px', height: '1px', backgroundColor: '#ddd' }}></div>
              Hide replies
            </button>
          )}
        </div>

        {/* Nested Replies */}
        {showReplies && (
          <div style={{ marginTop: '12px' }}>
             {isLoadingReplies ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#aaa' }}>
                   <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Loading replies...
                </div>
             ) : (
                repliesData?.comments?.map(reply => (
                  <CommentItem 
                    key={reply._id} 
                    comment={reply} 
                    token={token} 
                    user={user}
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
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0, padding: '0 8px' }}>
        <motion.button 
          whileTap={{ scale: comment.isOptimistic ? 1 : 0.8 }}
          onClick={() => !comment.isOptimistic && likeMutation.mutate()}
          style={{ background: 'none', border: 'none', color: comment.isOptimistic ? '#eee' : '#aaa', cursor: comment.isOptimistic ? 'default' : 'pointer', padding: 0 }}
          disabled={comment.isOptimistic || likeMutation.isPending}
        >
          <Heart size={14} fill={likeData.isLiked ? '#ef4444' : 'none'} color={likeData.isLiked ? '#ef4444' : 'currentColor'} />
        </motion.button>
        <span style={{ fontSize: '10px', color: '#888' }}>{likeData.count}</span>
      </div>
    </div>
  );
};

export default function CommentsModal({ story, isOpen, onClose, token, user, API_URL, updateCommentCount }) {
  const [commentInput, setCommentInput] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const parentRef = useRef(null);
  const queryClient = useQueryClient();
  const socket = useContext(SocketContext);

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

  const flatComments = data?.pages?.flatMap(page => page.comments) || [];

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? flatComments.length + 1 : flatComments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  useEffect(() => {
    const virtualItems = rowVirtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;
    const lastItem = virtualItems[virtualItems.length - 1];
    
    if (lastItem.index >= flatComments.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage, flatComments.length, isFetchingNextPage, rowVirtualizer]);

  useEffect(() => {
    if (replyingTo) {
      if (!commentInput.includes(`@${replyingTo.user?.username}`)) {
        setCommentInput(`@${replyingTo.user?.username} `);
      }
    }
  }, [replyingTo]);

  // Socket.io Real-time Updates
  useEffect(() => {
    if (isOpen && socket && story?._id) {
      socket.emit('join_story_room', story._id);
      
      const handleNewComment = (newComment) => {
        const uid = user?.id || user?._id;
        if (newComment.user._id === uid) return; // Handled by optimistic update
        
        const isReply = !!newComment.parent_id;
        if (isReply) {
          queryClient.setQueryData(['comments', story._id, 'replies', newComment.parent_id], (old) => {
            if (!old) return old;
            return {
              ...old,
              comments: [newComment, ...old.comments]
            };
          });
        } else {
          queryClient.setQueryData(['comments', story._id], (old) => {
            if (!old || !old.pages || old.pages.length === 0) return old;
            const newPages = [...old.pages];
            newPages[0] = { ...newPages[0], comments: [newComment, ...newPages[0].comments] };
            return { ...old, pages: newPages };
          });
          updateCommentCount(1);
        }
      };

      const handleLikeUpdate = ({ commentId, likesCount, senderId, isLiked, parentId }) => {
        const uid = user?.id || user?._id;
        if (senderId === uid) return; // Handled by local mutation
        
        const updateCache = (old) => {
          if (!old) return old;
          if (old.pages) {
            return {
              ...old,
              pages: old.pages.map(page => ({
                ...page,
                comments: page.comments.map(c => {
                  if (c._id === commentId) {
                    const newLikedBy = isLiked 
                      ? [...(c.liked_by || []), senderId]
                      : (c.liked_by || []).filter(id => id !== senderId);
                    return { ...c, likes_count: likesCount, liked_by: newLikedBy };
                  }
                  return c;
                })
              }))
            };
          }
          if (old.comments) {
             return {
               ...old,
               comments: old.comments.map(c => {
                 if (c._id === commentId) {
                   const newLikedBy = isLiked 
                     ? [...(c.liked_by || []), senderId]
                     : (c.liked_by || []).filter(id => id !== senderId);
                   return { ...c, likes_count: likesCount, liked_by: newLikedBy };
                 }
                 return c;
               })
             };
          }
          return old;
        };
        
        if (parentId) {
          queryClient.setQueryData(['comments', story._id, 'replies', parentId], updateCache);
        } else {
          queryClient.setQueryData(['comments', story._id], updateCache);
        }
      };

      socket.on('new_comment', handleNewComment);
      socket.on('update_comment_like', handleLikeUpdate);

      return () => {
        socket.emit('leave_story_room', story._id);
        socket.off('new_comment', handleNewComment);
        socket.off('update_comment_like', handleLikeUpdate);
      };
    }
  }, [isOpen, socket, story?._id, queryClient, user, updateCommentCount]);

  const postMutation = useMutation({
    mutationFn: async (text) => {
      const parentId = replyingTo ? (replyingTo.parent_id || replyingTo._id) : null;
      const res = await fetch(`${API_URL}/api/stories/${story._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text, parent_id: parentId })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('BACKEND ERROR:', data);
        throw new Error(data.message || 'Server error');
      }
      return data;
    },
    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: ['comments', story._id] });
      const previousComments = queryClient.getQueryData(['comments', story._id]);
      
      const newComment = {
        _id: Date.now().toString(),
        text,
        user: { username: 'You', avatarUrl: '' },
        created_at: new Date().toISOString(),
        likes_count: 0,
        reply_count: 0,
        parent_id: replyingTo ? (replyingTo.parent_id || replyingTo._id) : null,
        isOptimistic: true
      };

      if (!replyingTo) {
        queryClient.setQueryData(['comments', story._id], (old) => {
          if (!old) return old;
          const newPages = [...old.pages];
          newPages[0] = { ...newPages[0], comments: [newComment, ...newPages[0].comments] };
          return { ...old, pages: newPages };
        });
      }
      
      updateCommentCount(1);
      return { previousComments };
    },
    onError: (err, newComment, context) => {
      if(context?.previousComments) {
         queryClient.setQueryData(['comments', story._id], context.previousComments);
      }
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
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', zIndex: 999999 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '80vh', backgroundColor: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', zIndex: 999999, display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 40px rgba(0,0,0,0.3)' }}
          >
            {/* Drag Handle */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '16px', paddingBottom: '8px', cursor: 'pointer' }} onClick={onClose}>
               <div style={{ width: '48px', height: '6px', backgroundColor: '#ddd', borderRadius: '4px' }}></div>
            </div>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 16px', borderBottom: '1px solid #f3f4f6' }}>
              <h3 style={{ fontWeight: '700', color: '#111', textAlign: 'center', width: '100%', margin: 0, fontSize: '18px' }}>Comments</h3>
            </div>

            {/* Comments List (Virtual) */}
            <div ref={parentRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', WebkitOverflowScrolling: 'touch' }}>
              {status === 'pending' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', opacity: 0.6 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eee', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        <div style={{ height: '12px', backgroundColor: '#eee', borderRadius: '4px', width: '25%' }} />
                        <div style={{ height: '12px', backgroundColor: '#eee', borderRadius: '4px', width: '75%' }} />
                        <div style={{ height: '12px', backgroundColor: '#eee', borderRadius: '4px', width: '50%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : status === 'error' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444' }}>
                  <MessageCircle size={40} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>Error loading comments.</p>
                </div>
              ) : flatComments.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                  <MessageCircle size={56} style={{ marginBottom: '16px', opacity: 0.2 }} />
                  <p style={{ fontWeight: '600', color: '#4b5563', margin: '0 0 8px 0', fontSize: '16px' }}>No comments yet</p>
                  <p style={{ fontSize: '14px', margin: 0 }}>Be the first to start the conversation.</p>
                </div>
              ) : (
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const isLoaderRow = virtualRow.index > flatComments.length - 1;
                    const comment = flatComments[virtualRow.index];
                    
                    return (
                      <div
                        key={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        data-index={virtualRow.index}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {isLoaderRow ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                             <Loader2 style={{ animation: 'spin 1s linear infinite', color: '#9ca3af' }} />
                          </div>
                        ) : (
                          <CommentItem 
                            comment={comment} 
                            token={token} 
                            user={user}
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
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6', backgroundColor: '#fff', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
              <AnimatePresence>
                {replyingTo && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '10px 12px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', fontSize: '13px', color: '#4b5563', marginBottom: '8px' }}
                  >
                    <span>Replying to <span style={{ fontWeight: '600' }}>{replyingTo.user?.username}</span></span>
                    <button type="button" onClick={() => {
                        setReplyingTo(null);
                        setCommentInput(commentInput.replace(`@${replyingTo.user?.username} `, ''));
                    }} style={{ background: '#e5e7eb', border: 'none', padding: '4px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}>
                       <X size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                <img 
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=You`} 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eee', flexShrink: 0, objectFit: 'cover' }} 
                  alt=""
                />
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    placeholder={replyingTo ? 'Add a reply...' : 'Add a comment...'}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '24px', padding: '12px 48px 12px 20px', fontSize: '15px', outline: 'none', color: '#111' }}
                  />
                  <button 
                    type="submit" 
                    disabled={!commentInput.trim() || postMutation.isPending}
                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', padding: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', cursor: (!commentInput.trim() || postMutation.isPending) ? 'default' : 'pointer', opacity: (!commentInput.trim() || postMutation.isPending) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {postMutation.isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} style={{ marginLeft: '1px' }} />}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
