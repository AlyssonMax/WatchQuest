
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../services/db';
import { MediaList, WatchStatus, ReportReason, User, MediaType, ListItem, Comment } from '../types';
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
    
    // Detailed Episode Selector State
    const [selectedItemForEpisodes, setSelectedItemForEpisodes] = useState<ListItem | null>(null);
    const [currentViewingSeason, setCurrentViewingSeason] = useState(1);
    const [isSyncingEpisodes, setIsSyncingEpisodes] = useState(false);

    useEffect(() => {
        loadList();
    }, [listId]);

    const loadList = async () => {
        try {
            const data = await db.getListById(listId);
            const user = await db.getCurrentUser();
            if (data) {
                setList({ ...data }); 
                setCurrentUser(user);
                setIsFollowingList(user?.followedListIds?.includes(data.id) || false);
                const p = await db.calculateListProgress(data);
                setProgress(p);
            }
        } finally {
            setLoading(false);
        }
    };

    // Lazy Loading Trigger for Modal
    useEffect(() => {
        if (selectedItemForEpisodes && selectedItemForEpisodes.media.type !== MediaType.MOVIE) {
            const seasonData = selectedItemForEpisodes.media.seasonsData?.find(s => s.seasonNumber === currentViewingSeason);
            if (seasonData && (!seasonData.episodes || seasonData.episodes.length === 0)) {
                syncSeason(currentViewingSeason, selectedItemForEpisodes.media.id);
            }
        }
    }, [currentViewingSeason, selectedItemForEpisodes]);

    const syncSeason = async (seasonNum: number, mediaId: string) => {
        if (!list) return;
        setIsSyncingEpisodes(true);
        try {
            const updated = await db.syncSeasonEpisodes(list.id, mediaId, seasonNum);
            if (updated) {
                setList({ ...updated });
                if (selectedItemForEpisodes && selectedItemForEpisodes.media.id === mediaId) {
                    const item = updated.items.find(i => i.media.id === mediaId);
                    if (item) setSelectedItemForEpisodes(item);
                }
            }
        } finally {
            setIsSyncingEpisodes(false);
        }
    };

    const handleStatusChange = async (mediaId: string, newStatus: WatchStatus) => {
        if (!list || readOnly) return;
        
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

    const handleMinutesChange = async (mediaId: string, minutes: number) => {
        if (!list || readOnly) return;
        
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

    // Busca o maior episódio assistido de uma temporada específica no histórico
    const getMaxWatchedEpisodeInSeason = (item: ListItem, season: number) => {
        if (!item.watchedHistory) return 0;
        let maxEp = 0;
        item.watchedHistory.forEach(h => {
            const match = h.match(/S(\d+)E(\d+)/);
            if (match && parseInt(match[1]) === season) {
                maxEp = Math.max(maxEp, parseInt(match[2]));
            }
        });
        return maxEp;
    };

    const handleSeasonMarkerChange = async (item: ListItem, season: number) => {
        if (!list || readOnly) return;
        
        const totalSeasons = item.media.totalSeasons || 1;
        if (season < 1 || season > totalSeasons) return;

        // Ao mudar de temporada, buscamos qual foi o último episódio assistido NESSA temporada
        const episodeToRestore = getMaxWatchedEpisodeInSeason(item, season);

        // Antes de atualizar, sincronizamos a temporada se necessário para validar eps
        const seasonData = item.media.seasonsData?.find(s => s.seasonNumber === season);
        if (seasonData && (!seasonData.episodes || seasonData.episodes.length === 0)) {
            await syncSeason(season, item.media.id);
        }

        const updated = await db.setSeriesMarkers(list.id, item.media.id, season, episodeToRestore); 
        if (updated) {
            setList({ ...updated });
            const p = await db.calculateListProgress(updated);
            setProgress(p);
        }
    };

    const handleEpisodeMarkerChange = async (item: ListItem, episode: number) => {
        if (!list || readOnly) return;
        const currentSeason = item.currentSeason || 1;
        const seasonData = item.media.seasonsData?.find(s => s.seasonNumber === currentSeason);
        const maxEpisodes = seasonData?.episodesCount || 10;
        
        if (episode < 0 || episode > maxEpisodes) return;

        const updated = await db.setSeriesMarkers(list.id, item.media.id, currentSeason, episode);
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

    const handleDetailedProgress = async (mediaId: string, season: number, episode: number) => {
        if (!list || readOnly) return;
        
        const updated = await db.updateDetailedProgress(list.id, mediaId, season, episode);
        if (updated) {
            setList({ ...updated });
            const updatedItem = updated.items.find(i => i.media.id === mediaId);
            if (updatedItem) setSelectedItemForEpisodes(updatedItem);
            
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

    const handleToggleReaction = async (emoji: string) => {
        if (!list || !currentUser) return;
        const updatedReactions = await db.toggleReaction(list.id, emoji);
        setList({ ...list, reactions: updatedReactions });
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

    const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => (
        <div className="flex space-x-3 group animate-fade-in">
            <img src={comment.userAvatar} className="w-8 h-8 rounded-full border border-gray-700 mt-1" />
            <div className="flex-1">
                <div className="bg-gray-800 rounded-2xl px-4 py-2 border border-gray-700">
                    <p className="text-[10px] font-black text-purple-400 mb-0.5 uppercase tracking-wider">{comment.userName}</p>
                    <p className="text-sm text-gray-200 leading-relaxed">{comment.text}</p>
                </div>
                <p className="text-[9px] text-gray-600 mt-1 ml-2 font-black uppercase tracking-widest">
                    {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );

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
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-24 scrollbar-hide">
                {list.items.map((item) => {
                    const durationNum = parseInt(item.media.duration) || 120;
                    const isEpisodic = item.media.type !== MediaType.MOVIE;
                    const isWatching = item.status === WatchStatus.WATCHING;
                    
                    const currentSeason = item.currentSeason || 1;
                    const seasonData = item.media.seasonsData?.find(s => s.seasonNumber === currentSeason);
                    const currentSeasonEpisodesCount = seasonData?.episodesCount || 10;
                    const totalSeasons = item.media.totalSeasons || 1;

                    // O episódio exibido é o maior encontrado no histórico para a temporada atual
                    const currentEpValue = getMaxWatchedEpisodeInSeason(item, currentSeason);

                    return (
                        <div key={item.media.id} className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 flex flex-col transition-all active:scale-[0.99]">
                            <div className="flex">
                                <img src={item.media.poster} className="w-24 h-32 object-cover border-r border-gray-700" />
                                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <h3 
                                                onClick={() => isEpisodic && setSelectedItemForEpisodes(item)}
                                                className={`font-bold text-sm truncate pr-2 ${isEpisodic ? 'text-purple-400 cursor-pointer' : ''}`}
                                            >
                                                {item.media.title}
                                            </h3>
                                            <span className="text-[8px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 uppercase font-black">{item.media.type}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mb-2">{item.media.year} • {item.media.duration}</p>
                                        
                                        {isEpisodic && isWatching && !readOnly ? (
                                            <div className="space-y-4 mt-2">
                                                {/* Season Controls */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-[8px] text-gray-400 uppercase font-black mb-1">
                                                        <span>Season</span>
                                                    </div>
                                                    <div className="flex items-center space-x-3 bg-gray-900 rounded-xl p-1 border border-gray-700">
                                                        <button 
                                                            onClick={() => handleSeasonMarkerChange(item, currentSeason - 1)}
                                                            disabled={currentSeason <= 1}
                                                            className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg text-white disabled:opacity-20 active:scale-90 transition-all"
                                                        >
                                                            <i className="fas fa-minus text-[10px]"></i>
                                                        </button>
                                                        <div className="flex-1 text-center">
                                                            <span className="text-xs font-bold text-white">{currentSeason}</span>
                                                            <span className="text-[8px] text-gray-500 uppercase font-black ml-1">of {totalSeasons}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleSeasonMarkerChange(item, currentSeason + 1)}
                                                            disabled={currentSeason >= totalSeasons}
                                                            className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg text-white disabled:opacity-20 active:scale-90 transition-all"
                                                        >
                                                            <i className="fas fa-plus text-[10px]"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* Episode Controls */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-[8px] text-gray-400 uppercase font-black mb-1">
                                                        <span>Episode</span>
                                                    </div>
                                                    <div className="flex items-center space-x-3 bg-gray-900 rounded-xl p-1 border border-gray-700">
                                                        <button 
                                                            onClick={() => handleEpisodeMarkerChange(item, currentEpValue - 1)}
                                                            disabled={currentEpValue <= 0}
                                                            className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg text-white disabled:opacity-20 active:scale-90 transition-all"
                                                        >
                                                            <i className="fas fa-minus text-[10px]"></i>
                                                        </button>
                                                        <div className="flex-1 text-center">
                                                            <span className="text-xs font-bold text-white">{currentEpValue}</span>
                                                            <span className="text-[8px] text-gray-500 uppercase font-black ml-1">of {currentSeasonEpisodesCount}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleEpisodeMarkerChange(item, currentEpValue + 1)}
                                                            disabled={currentEpValue >= currentSeasonEpisodesCount}
                                                            className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg text-white disabled:opacity-20 active:scale-90 transition-all"
                                                        >
                                                            <i className="fas fa-plus text-[10px]"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : isEpisodic && item.media.seasonsData ? (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[10px]">
                                                    <span className="text-gray-400 uppercase font-black">Latest Progress</span>
                                                    <span className="text-white font-bold">S{item.currentSeason || 1}E{currentEpValue}</span>
                                                </div>
                                                <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-blue-500 transition-all" 
                                                        style={{ 
                                                            width: `${((item.watchedHistory?.length || 0) / Math.max(1, item.media.seasonsData.reduce((acc,s) => acc+(s.episodesCount || 10), 0))) * 100}%` 
                                                        }}
                                                    ></div>
                                                </div>
                                                <p className="text-[8px] text-gray-600 uppercase font-black text-right">{item.watchedHistory?.length || 0} episodes watched</p>
                                            </div>
                                        ) : null}

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

                                        {item.status === WatchStatus.WATCHED && (
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

                <div className="mt-8 border-t border-gray-800 pt-6 pb-24 relative">
                     <div className="flex items-center justify-between mb-4">
                        <div className="relative">
                            <button 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                                className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all ${myReaction ? 'bg-pink-500/20 text-pink-500 border border-pink-500/30' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}
                            >
                                <span className="text-lg">{myReaction ? myReaction.emoji : <i className="far fa-heart"></i>}</span>
                                <span className="font-black text-xs">{list.reactions.length}</span>
                            </button>
                            
                            {showEmojiPicker && (
                                <div className="absolute bottom-12 left-0 bg-gray-800 border border-gray-600 rounded-2xl shadow-2xl p-2 flex gap-1 z-30 animate-fade-in-up">
                                    {AVAILABLE_EMOJIS.map(emoji => (
                                        <button 
                                            key={emoji} 
                                            onClick={() => handleToggleReaction(emoji)}
                                            className="hover:scale-125 transition-transform text-xl p-1"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{list.comments.length} Comments</span>
                    </div>

                    <div className="flex space-x-2 mb-8">
                        <input 
                            type="text" 
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:border-purple-500 outline-none transition-all" 
                            placeholder="Start a conversation..." 
                            value={commentText} 
                            onChange={(e) => setCommentText(e.target.value)} 
                            onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                        />
                        <button 
                            onClick={handlePostComment} 
                            disabled={!commentText.trim()} 
                            className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition-all shadow-lg"
                        >
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>

                    {/* Render Comentários */}
                    <div className="space-y-6">
                        {list.comments.length === 0 ? (
                            <div className="text-center py-10 opacity-30">
                                <i className="fas fa-comments text-4xl mb-3"></i>
                                <p className="text-[10px] font-black uppercase tracking-widest">No comments yet</p>
                            </div>
                        ) : (
                            [...list.comments].sort((a,b) => b.timestamp - a.timestamp).map(c => (
                                <CommentItem key={c.id} comment={c} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Episode Selector Modal */}
            {selectedItemForEpisodes && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 w-full max-w-md rounded-t-[32px] border-t border-gray-800 shadow-2xl p-6 animate-fade-in-up max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <img src={selectedItemForEpisodes.media.poster} className="w-12 h-18 rounded-lg object-cover" />
                                <div>
                                    <h3 className="font-bold text-lg text-white leading-tight">{selectedItemForEpisodes.media.title}</h3>
                                    <p className="text-xs text-purple-400 font-black uppercase">{selectedItemForEpisodes.media.type}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItemForEpisodes(null)} className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400"><i className="fas fa-times"></i></button>
                        </div>

                        {/* Season Selection */}
                        <div className="flex space-x-2 overflow-x-auto pb-4 scrollbar-hide">
                            {selectedItemForEpisodes.media.seasonsData?.map(s => (
                                <button 
                                    key={s.seasonNumber}
                                    onClick={() => setCurrentViewingSeason(s.seasonNumber)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentViewingSeason === s.seasonNumber ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-800 text-gray-500'}`}
                                >
                                    Season {s.seasonNumber}
                                </button>
                            ))}
                        </div>

                        {/* Episodes Grid */}
                        <div className="mt-6">
                            {isSyncingEpisodes ? (
                                <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                                    <i className="fas fa-circle-notch fa-spin text-2xl mb-2"></i>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando episódios...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-5 gap-2">
                                    {selectedItemForEpisodes.media.seasonsData?.find(s => s.seasonNumber === currentViewingSeason)?.episodes?.map((ep) => {
                                        const epNum = ep.episodeNumber;
                                        const isWatched = selectedItemForEpisodes.watchedHistory?.includes(`S${currentViewingSeason}E${epNum}`);
                                        
                                        return (
                                            <button
                                                key={epNum}
                                                disabled={readOnly}
                                                onClick={() => handleDetailedProgress(selectedItemForEpisodes.media.id, currentViewingSeason, epNum)}
                                                className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${isWatched ? 'bg-green-600 text-white shadow-md' : 'bg-gray-800 text-gray-500'}`}
                                            >
                                                <span className="text-[10px] font-black">{epNum}</span>
                                                {isWatched && <i className="fas fa-check text-[8px] mt-1"></i>}
                                            </button>
                                        );
                                    })}
                                    
                                    {(!selectedItemForEpisodes.media.seasonsData?.find(s => s.seasonNumber === currentViewingSeason)?.episodes || 
                                      selectedItemForEpisodes.media.seasonsData?.find(s => s.seasonNumber === currentViewingSeason)?.episodes?.length === 0) && (
                                        <div className="col-span-5 py-8 text-center text-gray-600 text-xs italic">
                                            Nenhum episódio encontrado para esta temporada.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-8 flex items-center justify-center text-gray-500 text-[10px] font-black uppercase tracking-[2px] opacity-40">
                             Fim da Temporada
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
