
import React, { useState, useEffect, useRef } from 'react';
import { AVAILABLE_EMOJIS } from '../services/mockData';
import { MediaList, Reaction, ReportReason, WatchStatus } from '../types';
import { db } from '../services/db';

export const HomeScreen: React.FC<{ onNavigate: (tab: string, params?: any) => void }> = ({ onNavigate }) => {
    const [lists, setLists] = useState<MediaList[]>([]);
    const [loading, setLoading] = useState(true);

    const [reportListId, setReportListId] = useState<string | null>(null);
    const [reportReason, setReportReason] = useState<ReportReason>(ReportReason.INAPPROPRIATE_CONTENT);
    const [reportDetails, setReportDetails] = useState('');

    useEffect(() => {
        loadFeed();
    }, []);

    const loadFeed = async () => {
        const data = await db.getFeed();
        setLists(data);
        setLoading(false);
    };

    const handleReportSubmit = async () => {
        if(!reportListId) return;
        try {
            await db.submitReport(reportListId, 'list', reportReason, reportDetails);
            alert("Report submitted.");
            setReportListId(null);
            setReportDetails('');
        } catch (e) {
            alert("Error submitting report.");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading feed...</div>;

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-2xl font-bold px-1">Feed</h2>
            {lists.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                    No lists found. Be the first to create one!
                </div>
            ) : (
                lists.map((list) => (
                    <FeedCard 
                        key={list.id} 
                        list={list} 
                        onOpen={() => onNavigate('list_detail', { listId: list.id })} 
                        onReport={() => setReportListId(list.id)}
                        onUserClick={() => onNavigate('profile', { userId: list.creatorId })}
                    />
                ))
            )}

            {reportListId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-red-500"><i className="fas fa-exclamation-triangle mr-2"></i> Report Content</h3>
                            <button onClick={() => setReportListId(null)} className="text-gray-400 hover:text-white">
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
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Details (Optional)</label>
                                <textarea 
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white resize-none h-24 focus:border-red-500 outline-none"
                                    placeholder="Describe the issue..."
                                    value={reportDetails}
                                    onChange={(e) => setReportDetails(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleReportSubmit}
                                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition-colors"
                            >
                                Submit Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const FeedCard: React.FC<{ list: MediaList; onOpen: () => void; onReport: () => void; onUserClick: () => void }> = ({ list, onOpen, onReport, onUserClick }) => {
    const [reactions, setReactions] = useState<Reaction[]>(list.reactions);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [user, setUser] = useState<any>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        db.getCurrentUser().then(setUser);
        
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleReaction = async (emoji: string) => {
        if(!user) return;
        
        const previousReactions = [...reactions];
        const existing = reactions.find(r => r.userId === user.id && r.emoji === emoji);
        if (existing) {
            setReactions(reactions.filter(r => r.id !== existing.id));
        } else {
            setReactions([...reactions, { id: 'temp', userId: user.id, emoji, timestamp: Date.now() }]);
        }
        setShowEmojiPicker(false);

        try {
            const updatedReactions = await db.toggleReaction(list.id, emoji);
            setReactions(updatedReactions);
        } catch (e) {
            setReactions(previousReactions);
        }
    };

    const totalItems = list.items.length;
    
    const totalProgressValue = list.items.reduce((acc, item) => {
        if (item.status === WatchStatus.WATCHED) return acc + 100;
        if (item.status === WatchStatus.WATCHING) {
            const duration = parseInt(item.media.duration) || 120;
            const current = item.progressMinutes || 0;
            const p = Math.min(99, (current / duration) * 100);
            return acc + p;
        }
        return acc;
    }, 0);
    
    const progress = totalItems > 0 ? (totalProgressValue / totalItems) : 0;

    const countComments = (comments: any[]): number => {
        let count = comments.length;
        comments.forEach(c => {
            if (c.replies) count += countComments(c.replies);
        });
        return count;
    };
    
    const totalComments = countComments(list.comments);

    return (
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700 relative">
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 cursor-pointer group" onClick={onUserClick}>
                    <img src={list.creatorAvatar} alt={list.creatorName} className="w-10 h-10 rounded-full border-2 border-purple-500 object-cover group-hover:border-white transition-colors" />
                    <div>
                        <p className="font-semibold text-sm group-hover:text-purple-400 transition-colors">{list.creatorName}</p>
                        <p className="text-xs text-gray-400">Created a new list</p>
                    </div>
                </div>
                
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors">
                        <i className="fas fa-ellipsis-v"></i>
                    </button>
                    
                    {showMenu && (
                        <div className="absolute right-0 top-10 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-20 animate-fade-in overflow-hidden">
                             <button 
                                onClick={() => { 
                                    navigator.clipboard.writeText(`Check out this list: ${list.title}`); 
                                    setShowMenu(false);
                                    alert('Link copied to clipboard');
                                }} 
                                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-800 text-gray-300 flex items-center"
                            >
                                <i className="fas fa-share-alt w-5"></i> Share
                            </button>
                            <button 
                                onClick={() => { onReport(); setShowMenu(false); }} 
                                className="w-full text-left px-4 py-3 text-sm hover:bg-gray-800 text-red-400 flex items-center border-t border-gray-800"
                            >
                                <i className="fas fa-flag w-5"></i> Report
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 pb-2 cursor-pointer" onClick={onOpen}>
                <h3 className="text-lg font-bold text-white mb-1">{list.title}</h3>
                <p className="text-sm text-gray-300 mb-3 line-clamp-2">{list.description}</p>
                
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide pointer-events-none">
                    {list.items.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="relative flex-shrink-0 w-20">
                            <img src={item.media.poster} className="w-full rounded-md shadow-md aspect-[2/3] object-cover" />
                            {item.status === 'Watched' && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border border-white">
                                    <i className="fas fa-check text-[8px]"></i>
                                </div>
                            )}
                        </div>
                    ))}
                    {list.items.length > 4 && (
                        <div className="flex-shrink-0 w-20 bg-gray-700 rounded-md flex items-center justify-center aspect-[2/3]">
                            <span className="text-xs text-gray-400">+{list.items.length - 4} more</span>
                        </div>
                    )}
                </div>

                <div className="mt-3 flex items-center space-x-2 text-xs text-gray-400">
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span>{Math.round(progress)}%</span>
                </div>
            </div>

            <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700 flex items-center justify-between relative">
                <div className="flex space-x-1 min-h-[28px]">
                    {reactions.slice(0, 5).map((r, i) => (
                        <span key={i} className="text-lg animate-bounce-short cursor-default" title={r.emoji}>{r.emoji}</span>
                    ))}
                    {reactions.length > 5 && <span className="text-xs text-gray-500 self-center">+{reactions.length - 5}</span>}
                </div>
                
                <div className="flex space-x-4">
                    {list.badgeReward && (
                        <div className="flex items-center justify-center w-6 h-6" title={`Complete to earn: ${list.badgeReward.name}`}>
                            {list.badgeReward.icon.startsWith('data:') || list.badgeReward.icon.startsWith('http') ? (
                                <img src={list.badgeReward.icon} className="w-full h-full object-contain" />
                            ) : (
                                <i className={`fas ${list.badgeReward.icon} text-yellow-500`}></i>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-gray-400 hover:text-pink-500 transition-colors flex items-center space-x-1"
                    >
                        <i className="far fa-heart text-lg"></i>
                        <span className="text-xs">{reactions.length > 0 ? reactions.length : ''}</span>
                    </button>
                    <button onClick={onOpen} className="text-gray-400 hover:text-blue-500 transition-colors flex items-center space-x-1">
                        <i className="far fa-comment text-lg"></i>
                        <span className="text-xs">{totalComments > 0 ? totalComments : ''}</span>
                    </button>
                </div>

                {showEmojiPicker && (
                    <div className="absolute bottom-12 right-4 bg-gray-800 border border-gray-600 rounded-2xl shadow-xl p-2 flex gap-1 z-10 animate-fade-in-up">
                        {AVAILABLE_EMOJIS.map(emoji => (
                            <button 
                                key={emoji} 
                                onClick={() => toggleReaction(emoji)}
                                className="hover:scale-125 transition-transform text-xl p-1"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
