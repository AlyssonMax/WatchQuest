import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { MediaList, WatchStatus, ReportReason, User, Comment } from '../types';
import { AVAILABLE_EMOJIS } from '../services/mockData';

interface ListViewScreenProps {
    listId: string;
    readOnly?: boolean;
    onBack: () => void;
    onNavigate?: (tab: string, params?: any) => void;
}

const STREAMING_MAP: Record<string, { color: string, label: string }> = {
    'Netflix': { color: 'text-red-600', label: 'Netflix' },
    'Prime Video': { color: 'text-blue-500', label: 'Prime' },
    'Disney+': { color: 'text-blue-900', label: 'Disney+' },
    'HBO Max': { color: 'text-purple-700', label: 'Max' },
    'Hulu': { color: 'text-green-500', label: 'Hulu' },
    'Apple TV+': { color: 'text-gray-400', label: 'AppleTV' },
};

export const ListViewScreen: React.FC<ListViewScreenProps> = ({ listId, readOnly = true, onBack, onNavigate }) => {
    const [list, setList] = useState<MediaList | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState<ReportReason>(ReportReason.INAPPROPRIATE_CONTENT);
    const [reportDetails, setReportDetails] = useState('');
    const [isReporting, setIsReporting] = useState(false);
    
    // Stats & Follow
    const [stats, setStats] = useState({ followers: 0, completers: 0 });
    const [isFollowingList, setIsFollowingList] = useState(false);
    const [isFollowingUser, setIsFollowingUser] = useState(false);

    // Stats Modal
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [statsUsers, setStatsUsers] = useState<Array<{user: User, progress: number}>>([]);
    const [sortDesc, setSortDesc] = useState(true);
    
    // Comments
    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Reactions
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Celebration
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        loadList();
    }, [listId]);

    const loadList = async () => {
        try {
            const data = await db.getListById(listId);
            const user = await db.getCurrentUser();
            const listStats = await db.getListStats(listId);
            
            if (data && user) {
                setList(data);
                setCurrentUser(user);
                setIsFollowingList(user.followedListIds?.includes(data.id) || false);
                setIsFollowingUser(user.followingIds?.includes(data.creatorId) || false);
                setStats(listStats);
            } else if (data) {
                setList(data);
                setStats(listStats);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFollowList = async () => {
        if (!list) return;
        const newStatus = !isFollowingList;
        setIsFollowingList(newStatus); // Optimistic
        try {
            if (newStatus) {
                await db.followList(list.id);
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
                if (readOnly) {
                    alert("List saved to your profile! Go to 'My Lists' to track your progress.");
                }
            } else {
                await db.unfollowList(list.id);
                setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
            }
        } catch (e) {
            setIsFollowingList(!newStatus);
            alert("Action failed.");
        }
    };

    const handleOpenStatsModal = async () => {
        if (!list) return;
        setShowStatsModal(true);
        const users = await db.getListFollowers(list.id);
        setStatsUsers(users);
    };

    const handleToggleLike = async (emoji: string) => {
        if (!list || !currentUser) return;
        setShowEmojiPicker(false);
        try {
            const updatedReactions = await db.toggleReaction(list.id, emoji);
            setList(prev => prev ? ({ ...prev, reactions: updatedReactions }) : null);
        } catch (e) {
            console.error("Failed to toggle like");
        }
    };

    const handleStatusChange = async (movieId: string, newStatus: WatchStatus) => {
        if (!list || readOnly) return;
        const previousItems = [...list.items];
        
        // Optimistic
        const updatedItems = list.items.map(item => {
            if (item.movie.id === movieId) {
                const progress = newStatus === WatchStatus.WATCHING ? (item.progressMinutes || 0) : item.progressMinutes;
                return { ...item, status: newStatus, progressMinutes: progress };
            }
            return item;
        });
        
        // Check for 100% completion to trigger confetti
        const total = updatedItems.length;
        const watched = updatedItems.filter(i => i.status === WatchStatus.WATCHED).length;
        if (watched === total && newStatus === WatchStatus.WATCHED) {
            triggerConfetti();
        }

        setList({ ...list, items: updatedItems });

        try {
            await db.updateItemStatus(list.id, movieId, newStatus);
            const fresh = await db.getListById(list.id);
            if (fresh) setList(fresh);
        } catch (e) {
            setList({ ...list, items: previousItems });
            alert("Connection error: Could not update status.");
        }
    };

    const triggerConfetti = () => {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000); // Stop after 3s
    };

    const handleProgressUpdate = async (movieId: string, minutes: number) => {
        if (!list || readOnly) return;
        
        const updatedItems = list.items.map(item => {
            if (item.movie.id === movieId) {
                return { ...item, progressMinutes: minutes };
            }
            return item;
        });
        setList({ ...list, items: updatedItems });
        await db.updateProgressMinutes(list.id, movieId, minutes);
    };

    const handleSubmitReport = async () => {
        if (!list) return;
        setIsReporting(true);
        try {
            await db.submitReport(list.id, 'list', reportReason, reportDetails);
            alert("Report submitted successfully.");
            setShowReportModal(false);
            setReportDetails('');
        } catch (e) {
            alert("Failed to submit report.");
        } finally {
            setIsReporting(false);
        }
    };
    
    // COMMENT LOGIC
    const handlePostComment = async () => {
        if (!list || !commentText.trim()) return;
        setIsSubmittingComment(true);
        try {
            const parentId = replyingTo ? replyingTo.id : undefined;
            const updatedList = await db.addComment(list.id, commentText, parentId);
            setList(updatedList); // db returns full object now
            setCommentText('');
            setReplyingTo(null);
        } catch (e) {
            alert("Failed to post comment.");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleReplyClick = (commentId: string, authorName: string) => {
        setReplyingTo({ id: commentId, name: authorName });
        // Add @mention to text if empty
        if (!commentText.includes(`@${authorName}`)) {
            setCommentText(`@${authorName} ${commentText}`);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!list) return;
        if (!confirm("Delete this comment?")) return;
        try {
            const updatedList = await db.deleteComment(list.id, commentId);
            setList(updatedList);
        } catch (e) {
            alert("Failed to delete comment.");
        }
    };

    const renderTextWithMentions = (text: string) => {
        const parts = text.split(/(@\w+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                return <span key={i} className="text-purple-400 font-bold">{part}</span>;
            }
            return part;
        });
    };

    // Recursive Comment Component
    const CommentItem: React.FC<{ comment: Comment, depth?: number }> = ({ comment, depth = 0 }) => (
        <div className={`group ${depth > 0 ? 'ml-8 mt-2 border-l-2 border-gray-700 pl-3' : 'mt-4'}`}>
             <div className="flex space-x-3">
                <img 
                    src={comment.userAvatar} 
                    className="w-8 h-8 rounded-full object-cover cursor-pointer"
                    onClick={() => onNavigate && onNavigate('profile', { userId: comment.userId })}
                />
                <div className="flex-1">
                    <div className="bg-gray-800 rounded-2xl rounded-tl-none p-3 border border-gray-700/50">
                        <div className="flex justify-between items-center mb-1">
                            <span 
                                className="font-bold text-xs text-white hover:underline cursor-pointer"
                                onClick={() => onNavigate && onNavigate('profile', { userId: comment.userId })}
                            >
                                {comment.userName}
                            </span>
                            <span className="text-[9px] text-gray-500">{new Date(comment.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-300">{renderTextWithMentions(comment.text)}</p>
                    </div>
                    
                    <div className="flex items-center mt-1 space-x-3 ml-2">
                         <button 
                            onClick={() => handleReplyClick(comment.id, comment.userName)}
                            className="text-[10px] text-gray-500 hover:text-purple-400 font-bold"
                        >
                            Reply
                        </button>
                        {(currentUser?.id === comment.userId || currentUser?.id === list?.creatorId || currentUser?.role === 'admin') && (
                            <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-[10px] text-red-500/50 hover:text-red-500"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {/* Render Replies */}
            {comment.replies && comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
        </div>
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Loading list...</div>;
    if (!list) return <div className="p-8 text-center text-red-500">List not found</div>;

    const totalItems = list.items.length;
    const watchedItems = list.items.filter(i => i.status === WatchStatus.WATCHED).length;
    
    const totalProgressValue = list.items.reduce((acc, item) => {
        if (item.status === WatchStatus.WATCHED) return acc + 100;
        if (item.status === WatchStatus.WATCHING) {
            const duration = parseInt(item.movie.duration) || 120;
            const current = item.progressMinutes || 0;
            const percent = Math.min(99, (current / duration) * 100);
            return acc + percent;
        }
        return acc;
    }, 0);
    
    const progress = totalItems === 0 ? 0 : Math.round(totalProgressValue / totalItems);
    const isOwnList = currentUser?.id === list.creatorId;
    
    // Check if current user has reacted
    const myReaction = currentUser ? list.reactions.find(r => r.userId === currentUser.id) : null;
    const isLiked = !!myReaction;

    // Filter Stats Users
    const sortedStatsUsers = [...statsUsers].sort((a, b) => {
        return sortDesc ? b.progress - a.progress : a.progress - b.progress;
    });

    return (
        <div className="h-full flex flex-col bg-gray-900 relative overflow-hidden">
            {/* Confetti Effect */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
                     {[...Array(20)].map((_, i) => (
                         <div key={i} className="absolute animate-confetti" style={{
                             left: `${Math.random() * 100}%`,
                             top: '-5%',
                             backgroundColor: ['#ff0', '#f0f', '#0ff', '#0f0', '#f00'][Math.floor(Math.random() * 5)],
                             width: '10px',
                             height: '10px',
                             animationDelay: `${Math.random() * 2}s`,
                             animationDuration: `${2 + Math.random() * 3}s`
                         }}></div>
                     ))}
                </div>
            )}
            
            <style>{`
                @keyframes confetti {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                .animate-confetti {
                    animation: confetti linear forwards;
                }
            `}</style>

            {/* Header */}
            <div className="p-4 bg-gray-800/80 backdrop-blur-md border-b border-gray-700 flex items-center sticky top-0 z-10">
                <button onClick={onBack} className="mr-4 text-gray-400 hover:text-white">
                    <i className="fas fa-arrow-left text-xl"></i>
                </button>
                <div className="flex-1 overflow-hidden">
                    <h2 className="text-lg font-bold truncate">{list.title}</h2>
                    <div className="flex items-center space-x-2">
                        <p 
                            className="text-xs text-gray-400 truncate cursor-pointer hover:text-purple-400 transition-colors"
                            onClick={() => onNavigate && onNavigate('profile', { userId: list.creatorId })}
                        >
                            by {list.creatorName}
                        </p>
                    </div>
                    {/* Stats Clickable Area */}
                    <div className="flex space-x-3 mt-1 cursor-pointer" onClick={handleOpenStatsModal}>
                        <span className="text-[10px] text-gray-400 hover:text-white transition-colors">
                            <i className="fas fa-users mr-1"></i> {stats.followers} Followers
                        </span>
                        <span className="text-[10px] text-gray-400 hover:text-white transition-colors">
                            <i className="fas fa-check-double mr-1"></i> {stats.completers} Completed
                        </span>
                    </div>
                </div>
                <div className="text-right flex items-center space-x-3">
                    {!isOwnList && (
                        <button 
                            onClick={handleToggleFollowList}
                            className={`transition-colors text-xl ${isFollowingList ? 'text-purple-500' : 'text-gray-500 hover:text-white'}`}
                            title={isFollowingList ? "Unfollow List" : "Follow List (Copy to Profile)"}
                        >
                            <i className={`${isFollowingList ? 'fas' : 'far'} fa-bookmark`}></i>
                        </button>
                    )}
                    <button 
                        onClick={() => setShowReportModal(true)} 
                        className="text-gray-500 hover:text-red-500 transition-colors"
                        title="Report List"
                    >
                        <i className="fas fa-flag"></i>
                    </button>
                </div>
            </div>

            {/* List Info */}
            <div className="p-4 bg-gray-900">
                <p className="text-gray-400 text-sm italic mb-4">"{list.description}"</p>
                
                {/* Progress Bar (Visible even if ReadOnly - shows MY progress) */}
                <div className="w-full bg-gray-800 rounded-full h-2.5 mb-1 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">
                    <span>Your Progress</span>
                    <span>{watchedItems}/{totalItems} Completed</span>
                </div>
                
                {/* EARNED BANNER - SHOW ONLY WHEN 100% COMPLETE */}
                {progress === 100 && (
                    <div className="mt-3 bg-gradient-to-r from-yellow-900/40 to-yellow-800/40 border border-yellow-500/30 p-3 rounded-xl flex items-center animate-fade-in relative overflow-hidden group">
                        <div className="absolute inset-0 bg-yellow-500/10 animate-pulse"></div>
                        <div className="w-12 h-12 flex-shrink-0 mr-3 relative z-10">
                             {/* Show the actual patch/reward icon if available */}
                             {list.badgeReward?.icon.startsWith('data:') ? (
                                <img src={list.badgeReward.icon} className="w-full h-full object-contain drop-shadow-lg" />
                             ) : (
                                <div className="w-full h-full bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500">
                                    <i className={`fas ${list.badgeReward?.icon || 'fa-trophy'} text-xl`}></i>
                                </div>
                             )}
                        </div>
                        <div className="relative z-10">
                            <p className="text-yellow-400 font-black text-sm uppercase tracking-wide">Patch Earned</p>
                            <p className="text-xs text-yellow-200/70">You have completed 100% of this list.</p>
                        </div>
                    </div>
                )}

                {readOnly && progress < 100 && (
                    <div className="mt-2 text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg flex items-center">
                        <i className="fas fa-info-circle mr-2"></i>
                        {isFollowingList 
                            ? "Go to 'My Lists' to update your progress." 
                            : "Follow this list to track your progress."}
                    </div>
                )}
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto px-4 space-y-3">
                {list.items.map((item) => {
                    const totalMinutes = parseInt(item.movie.duration) || 120;
                    const currentMinutes = item.progressMinutes || 0;
                    
                    return (
                        <div key={item.movie.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-sm relative flex flex-col">
                            <div className="flex">
                                <div className="w-20 h-32 relative flex-shrink-0">
                                    <img src={item.movie.poster} className="w-full h-full object-cover" />
                                    {item.status === WatchStatus.WATCHED && (
                                        <div className="absolute inset-0 bg-green-900/60 flex items-center justify-center backdrop-blur-[1px]">
                                            <i className="fas fa-check text-white text-2xl drop-shadow-lg"></i>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                    <div>
                                        <h3 className="font-bold text-sm leading-tight mb-1 truncate">{item.movie.title}</h3>
                                        <div className="flex flex-wrap items-center text-xs text-gray-400 gap-x-2 gap-y-1">
                                            <span>{item.movie.year}</span>
                                            <span>•</span>
                                            <span>{item.movie.duration}</span>
                                            {item.movie.availableOn && item.movie.availableOn.length > 0 && (
                                                <div className="flex items-center space-x-2 ml-1 border-l border-gray-600 pl-2">
                                                    {item.movie.availableOn.map(svc => {
                                                        const info = STREAMING_MAP[svc];
                                                        return info ? (
                                                            <i key={svc} className={`fas fa-play-circle ${info.color}`} title={`Available on ${info.label}`}></i>
                                                        ) : null;
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Controls - ONLY VISIBLE IF NOT READONLY */}
                                    {!readOnly && (
                                        <div className="mt-2 flex items-center justify-between">
                                            <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                                                <StatusBtn 
                                                    active={item.status === WatchStatus.UNWATCHED} 
                                                    icon="fa-eye-slash" 
                                                    onClick={() => handleStatusChange(item.movie.id, WatchStatus.UNWATCHED)}
                                                    title="Mark Unwatched"
                                                />
                                                <StatusBtn 
                                                    active={item.status === WatchStatus.WATCHING} 
                                                    icon="fa-play" 
                                                    onClick={() => handleStatusChange(item.movie.id, WatchStatus.WATCHING)}
                                                    color="text-blue-400"
                                                    title="Mark Watching"
                                                />
                                                <StatusBtn 
                                                    active={item.status === WatchStatus.WATCHED} 
                                                    icon="fa-check" 
                                                    onClick={() => handleStatusChange(item.movie.id, WatchStatus.WATCHED)}
                                                    color="text-green-500"
                                                    title="Mark Watched"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Slider - ONLY VISIBLE IF NOT READONLY AND WATCHING */}
                            {!readOnly && item.status === WatchStatus.WATCHING && (
                                <div className="px-3 pb-3 pt-1 bg-gray-800/50 border-t border-gray-700/50">
                                    <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-mono">
                                        <span>{currentMinutes}m watched</span>
                                        <span>{totalMinutes}m total</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max={totalMinutes} 
                                        value={currentMinutes} 
                                        onChange={(e) => handleProgressUpdate(item.movie.id, parseInt(e.target.value))}
                                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {/* COMMENTS SECTION */}
                <div className="mt-8 mb-20 border-t border-gray-700 pt-4 relative">
                    
                    {/* Interaction Header */}
                    <div className="flex items-center justify-between px-2 mb-4">
                        <div className="relative">
                            <button 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors ${isLiked ? 'bg-pink-500/20 text-pink-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                            >
                                <span className="text-lg">{isLiked && myReaction ? myReaction.emoji : <i className="far fa-heart"></i>}</span>
                                <span className="font-bold text-sm">{list.reactions.length}</span>
                            </button>

                             {/* Floating Emoji Picker */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-10 left-0 bg-gray-800 border border-gray-600 rounded-2xl shadow-xl p-2 flex gap-1 z-20 animate-fade-in-up">
                                    {AVAILABLE_EMOJIS.map(emoji => (
                                        <button 
                                            key={emoji} 
                                            onClick={() => handleToggleLike(emoji)}
                                            className="hover:scale-125 transition-transform text-xl p-1"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <h3 className="text-sm font-bold text-gray-400">
                             <i className="fas fa-comment mr-2"></i>
                             {list.comments ? list.comments.length : 0} Comments
                        </h3>
                    </div>
                    
                    {/* Add Comment Input */}
                    <div className="px-2 mb-4">
                        {replyingTo && (
                            <div className="text-xs text-purple-400 mb-1 flex items-center">
                                <span>Replying to <b>{replyingTo.name}</b></span>
                                <button onClick={() => setReplyingTo(null)} className="ml-2 text-gray-500 hover:text-white"><i className="fas fa-times"></i></button>
                            </div>
                        )}
                        <div className="flex space-x-2">
                            <input 
                                type="text" 
                                className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                            />
                            <button 
                                onClick={handlePostComment}
                                disabled={!commentText.trim() || isSubmittingComment}
                                className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center disabled:opacity-50"
                            >
                                <i className="fas fa-paper-plane text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2 px-2">
                        {!list.comments || list.comments.length === 0 ? (
                            <p className="text-center text-gray-500 text-sm py-4">No comments yet. Be the first!</p>
                        ) : (
                            list.comments.map(comment => (
                                <CommentItem key={comment.id} comment={comment} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* REPORT MODAL */}
            {showReportModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm overflow-hidden shadow-2xl">
                         {/* ... (Existing report modal code) ... */}
                         <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-red-500"><i className="fas fa-exclamation-triangle mr-2"></i> Report Content</h3>
                            <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-white">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Reason</label>
                                <select 
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white outline-none focus:border-red-500"
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value as ReportReason)}
                                >
                                    <option value={ReportReason.INAPPROPRIATE_CONTENT}>Inappropriate Image/Content</option>
                                    <option value={ReportReason.INCORRECT_INFO}>Incorrect Movie Information</option>
                                    <option value={ReportReason.SPAM}>Spam</option>
                                    <option value={ReportReason.OTHER}>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Details</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white resize-none h-24 focus:border-red-500 outline-none"
                                    placeholder="Describe issue..."
                                    value={reportDetails}
                                    onChange={(e) => setReportDetails(e.target.value)}
                                />
                            </div>
                            <button onClick={handleSubmitReport} className="w-full bg-red-600 text-white font-bold py-3 rounded-lg">Submit Report</button>
                        </div>
                    </div>
                </div>
            )}

            {/* STATS MODAL */}
            {showStatsModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[70vh]">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800">
                            <div>
                                <h3 className="font-bold text-lg">Community Stats</h3>
                                <button onClick={() => setSortDesc(!sortDesc)} className="text-xs text-purple-400 font-bold mt-1">
                                    <i className={`fas fa-sort-${sortDesc ? 'down' : 'up'} mr-1`}></i>
                                    Sort by Progress
                                </button>
                            </div>
                            <button onClick={() => setShowStatsModal(false)} className="text-gray-400 hover:text-white">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2">
                             {sortedStatsUsers.length === 0 ? (
                                 <div className="text-center py-10 text-gray-500 italic">No activity yet.</div>
                             ) : (
                                 <div className="space-y-2">
                                     {sortedStatsUsers.map(({user, progress}) => (
                                         <div 
                                             key={user.id} 
                                             onClick={() => { setShowStatsModal(false); onNavigate && onNavigate('profile', { userId: user.id }); }}
                                             className="flex items-center p-3 rounded-xl hover:bg-gray-800 cursor-pointer transition-colors border border-gray-800 hover:border-gray-700"
                                         >
                                             <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-700 mr-3" />
                                             <div className="flex-1 min-w-0">
                                                 <p className="font-bold text-sm text-white truncate">{user.name}</p>
                                                 <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                                                     <div className={`h-1.5 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-purple-500'}`} style={{width: `${progress}%`}}></div>
                                                 </div>
                                             </div>
                                             <div className="ml-3 font-mono font-bold text-sm text-gray-400">{progress}%</div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBtn: React.FC<{ active: boolean; icon: string; onClick: () => void; color?: string; spin?: boolean; title?: string }> = ({ active, icon, onClick, color = 'text-white', spin, title }) => (
    <button 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        title={title}
        className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${active ? `bg-gray-700 shadow-inner ring-1 ring-gray-600 ${color}` : 'hover:bg-gray-800 text-gray-500'}`}
    >
        <i className={`fas ${icon} ${spin ? 'fa-spin' : ''} text-sm`}></i>
    </button>
);
