
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../services/db';
import { MediaList, WatchStatus, ReportReason, User, MediaType } from '../types';
import { AVAILABLE_EMOJIS } from '../services/mockData';

interface ListViewScreenProps {
    listId: string;
    readOnly?: boolean;
    onBack: () => void;
    onNavigate?: (tab: string, params?: any) => void;
}

export const ListViewScreen: React.FC<ListViewScreenProps> = ({ listId, readOnly = true, onBack, onNavigate }) => {
    const [list, setList] = useState<MediaList | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isFollowingList, setIsFollowingList] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [commentText, setCommentText] = useState('');

    useEffect(() => {
        loadList();
    }, [listId]);

    const loadList = async () => {
        try {
            const data = await db.getListById(listId);
            const user = await db.getCurrentUser();
            if (data) {
                setList(data);
                setCurrentUser(user);
                setIsFollowingList(user?.followedListIds?.includes(data.id) || false);
                const p = await db.calculateListProgress(data);
                setProgress(p);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (mediaId: string, newStatus: WatchStatus) => {
        if (!list || readOnly) return;
        
        // Atualização otimista
        setList(prev => {
            if(!prev) return null;
            return {
                ...prev,
                items: prev.items.map(item => 
                    item.media.id === mediaId ? { ...item, status: newStatus } : item
                )
            };
        });

        const updated = await db.updateItemStatus(list.id, mediaId, newStatus);
        if (updated) {
            setList({ ...updated });
            const p = await db.calculateListProgress(updated);
            if (p === 100 && progress < 100) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
            }
            setProgress(p);
        }
    };

    const handleEpisodeChange = async (mediaId: string, episode: number) => {
        if (!list || readOnly) return;
        
        // Otimista
        setList(prev => {
            if(!prev) return null;
            return {
                ...prev,
                items: prev.items.map(item => 
                    item.media.id === mediaId ? { ...item, currentEpisode: episode } : item
                )
            };
        });

        const updated = await db.updateEpisodeProgress(list.id, mediaId, episode);
        if (updated) {
            setList({ ...updated });
            const p = await db.calculateListProgress(updated);
            if (p === 100 && progress < 100) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
            }
            setProgress(p);
        }
    };

    const handleMinutesChange = async (mediaId: string, minutes: number) => {
        if (!list || readOnly) return;
        
        // Otimista
        setList(prev => {
            if(!prev) return null;
            return {
                ...prev,
                items: prev.items.map(item => 
                    item.media.id === mediaId ? { ...item, progressMinutes: minutes } : item
                )
            };
        });

        const updated = await db.updateMinutesProgress(list.id, mediaId, minutes);
        if (updated) {
            setList({ ...updated });
            const p = await db.calculateListProgress(updated);
            if (p === 100 && progress < 100) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
            }
            setProgress(p);
        }
    };

    const handleToggleFollow = async () => {
        if (!list) return;
        if (isFollowingList) await db.unfollowList(list.id);
        else await db.followList(list.id);
        setIsFollowingList(!isFollowingList);
    };

    const handleReaction = async (emoji: string) => {
        if (!list) return;
        const updatedReactions = await db.toggleReaction(list.id, emoji);
        setList(prev => prev ? ({ ...prev, reactions: updatedReactions }) : null);
        setShowEmojiPicker(false);
    };

    const handlePostComment = async () => {
        if (!list || !commentText.trim()) return;
        const updated = await db.addComment(list.id, commentText);
        setList({ ...updated });
        setCommentText('');
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading list...</div>;
    if (!list) return <div className="p-8 text-center text-red-500">List not found</div>;

    const myReaction = currentUser ? list.reactions.find(r => r.userId === currentUser.id) : null;

    return (
        <div className="h-full flex flex-col bg-gray-900 relative overflow-hidden">
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
                    <div className="text-4xl animate-bounce">🎊 CONQUERED! 🎊</div>
                </div>
            )}
            
            <div className="p-4 bg-gray-800/80 backdrop-blur-md border-b border-gray-700 flex items-center sticky top-0 z-20">
                <button onClick={onBack} className="mr-4 text-gray-400"><i className="fas fa-arrow-left text-xl"></i></button>
                <div className="flex-1 overflow-hidden">
                    <h2 className="text-lg font-bold truncate">{list.title}</h2>
                    <p className="text-[10px] text-gray-500 uppercase font-black">by {list.creatorName}</p>
                </div>
                {/* O botão de "Salvar" (Bookmark) agora aparece sempre que o usuário não for o criador, mesmo no modo readOnly */}
                {currentUser?.id !== list.creatorId && (
                    <button onClick={handleToggleFollow} className={`text-xl transition-colors ${isFollowingList ? 'text-purple-500' : 'text-gray-600'}`}>
                        <i className={`${isFollowingList ? 'fas' : 'far'} fa-bookmark`}></i>
                    </button>
                )}
            </div>

            <div className="p-4 bg-gray-900/50">
                <p className="text-gray-400 text-sm italic mb-4 line-clamp-3">"{list.description}"</p>
                <div className="w-full bg-gray-800 rounded-full h-2 mb-1 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-700" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 uppercase font-black tracking-widest">
                    <span>Overall Progress</span>
                    <span className={progress === 100 ? 'text-yellow-500' : ''}>{progress}%</span>
                </div>
                
                {progress === 100 && list.badgeReward && (
                    <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl flex items-center animate-fade-in shadow-xl">
                        <div className="w-12 h-12 flex-shrink-0 mr-4 flex items-center justify-center bg-yellow-500/20 rounded-full text-yellow-500">
                             <i className={`fas ${list.badgeReward.icon} text-2xl`}></i>
                        </div>
                        <div>
                            <p className="text-yellow-500 font-black text-xs uppercase tracking-widest">Collection Earned!</p>
                            <p className="text-[10px] text-yellow-100/70">{list.badgeReward.name}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-24 scrollbar-hide">
                {list.items.map((item) => {
                    const durationNum = parseInt(item.media.duration) || 120;
                    const isEpisodic = item.media.type !== MediaType.MOVIE;
                    const isWatching = item.status === WatchStatus.WATCHING;

                    return (
                        <div key={item.media.id} className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 flex flex-col transition-all active:scale-[0.99]">
                            <div className="flex">
                                <img src={item.media.poster} className="w-24 h-32 object-cover border-r border-gray-700" />
                                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-sm truncate pr-2">{item.media.title}</h3>
                                            <span className="text-[8px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 uppercase font-black">{item.media.type}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mb-2">{item.media.year} • {item.media.duration}</p>
                                        
                                        {isEpisodic && item.media.totalEpisodes && (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-gray-400 uppercase font-black">Episode Track</span>
                                                    <span className="text-white font-bold">{item.currentEpisode || 0} / {item.media.totalEpisodes}</span>
                                                </div>
                                                {!readOnly ? (
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => handleEpisodeChange(item.media.id, (item.currentEpisode || 0) - 1)} className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-xs active:scale-90"><i className="fas fa-minus"></i></button>
                                                        <div className="flex-1 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500 transition-all" style={{ width: `${((item.currentEpisode || 0) / item.media.totalEpisodes) * 100}%` }}></div>
                                                        </div>
                                                        <button onClick={() => handleEpisodeChange(item.media.id, (item.currentEpisode || 0) + 1)} className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-xs active:scale-90"><i className="fas fa-plus"></i></button>
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${((item.currentEpisode || 0) / item.media.totalEpisodes) * 100}%` }}></div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!isEpisodic && isWatching && !readOnly && (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-gray-400 uppercase font-black">Minutes Track</span>
                                                    <span className="text-white font-bold">{item.progressMinutes || 0} / {durationNum} min</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="0" 
                                                    max={durationNum} 
                                                    value={item.progressMinutes || 0} 
                                                    onChange={(e) => handleMinutesChange(item.media.id, parseInt(e.target.value))}
                                                    className="w-full h-1.5 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                />
                                            </div>
                                        )}

                                        {!isEpisodic && !readOnly && item.status === WatchStatus.WATCHED && (
                                            <div className="flex items-center space-x-2 text-[10px] text-green-500 font-bold uppercase mt-1">
                                                <i className="fas fa-check-circle"></i>
                                                <span>Finalizado</span>
                                            </div>
                                        )}
                                    </div>

                                    {!readOnly && (
                                        <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-700 w-full mt-2">
                                            <button onClick={() => handleStatusChange(item.media.id, WatchStatus.UNWATCHED)} className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${item.status === WatchStatus.UNWATCHED ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>Unwatched</button>
                                            <button onClick={() => handleStatusChange(item.media.id, WatchStatus.WATCHING)} className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${item.status === WatchStatus.WATCHING ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500'}`}>Watching</button>
                                            <button onClick={() => handleStatusChange(item.media.id, WatchStatus.WATCHED)} className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${item.status === WatchStatus.WATCHED ? 'bg-green-600/20 text-green-500' : 'text-gray-500'}`}>Watched</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="mt-8 border-t border-gray-800 pt-6 pb-20">
                     <div className="flex items-center justify-between mb-4">
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${myReaction ? 'bg-pink-500/20 text-pink-500 border border-pink-500/30' : 'bg-gray-800 text-gray-500'}`}>
                            <span className="text-lg">{myReaction ? myReaction.emoji : <i className="far fa-heart"></i>}</span>
                            <span className="font-black text-xs">{list.reactions.length}</span>
                        </button>
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{list.comments.length} Discussion</h3>
                    </div>
                    <div className="flex space-x-2 mb-6">
                        <input type="text" className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500 outline-none" placeholder="Start a conversation..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                        <button onClick={handlePostComment} disabled={!commentText.trim()} className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all"><i className="fas fa-paper-plane"></i></button>
                    </div>

                    {showEmojiPicker && (
                        <div className="absolute bottom-20 left-4 right-4 bg-gray-800 border border-gray-700 p-3 rounded-2xl flex justify-around animate-fade-in-up z-50">
                            {AVAILABLE_EMOJIS.map(emoji => (
                                <button key={emoji} onClick={() => handleReaction(emoji)} className="text-2xl hover:scale-125 transition-transform">{emoji}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
