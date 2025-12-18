import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { MediaList, WatchStatus } from '../types';

export const MyListsScreen: React.FC<{ onNavigate: (tab: string, params?: any) => void }> = ({ onNavigate }) => {
    const [tab, setTab] = useState<'created' | 'saved'>('created');
    const [createdLists, setCreatedLists] = useState<MediaList[]>([]);
    const [savedLists, setSavedLists] = useState<MediaList[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLists();
    }, [tab]);

    const loadLists = async () => {
        setLoading(true);
        if (tab === 'created') {
            // Check cache or simple state if we want to avoid re-fetch, but fine for now
            const data = await db.getMyLists();
            setCreatedLists(data);
        } else {
            const data = await db.getFollowedLists();
            setSavedLists(data);
        }
        setLoading(false);
    };

    const displayLists = tab === 'created' ? createdLists : savedLists;

    return (
        <div className="p-4 space-y-4 flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-2">Library</h2>

            {/* Tabs */}
            <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
                <button 
                    onClick={() => setTab('created')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === 'created' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    My Lists
                </button>
                <button 
                    onClick={() => setTab('saved')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === 'saved' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    Saved
                </button>
            </div>

            {loading ? (
                <div className="p-8 text-center text-gray-500">Loading lists...</div>
            ) : (
                <div className="flex-1 overflow-y-auto pb-20 space-y-4">
                    {displayLists.length === 0 && (
                        <div className="text-center py-20 text-gray-400">
                            <i className={`${tab === 'created' ? 'fas fa-clipboard-list' : 'far fa-bookmark'} text-4xl mb-3 opacity-30`}></i>
                            <p>{tab === 'created' ? "You haven't created any lists yet." : "You haven't saved any lists yet."}</p>
                        </div>
                    )}
                    
                    {displayLists.map(list => {
                        // Calculate completion
                        const total = list.items.length;
                        const watched = list.items.filter(i => i.status === WatchStatus.WATCHED).length;
                        
                        // NEW CALCULATION
                        const totalProgressValue = list.items.reduce((acc, item) => {
                            if (item.status === WatchStatus.WATCHED) return acc + 100;
                            if (item.status === WatchStatus.WATCHING) {
                                const duration = parseInt(item.movie.duration) || 120;
                                const current = item.progressMinutes || 0;
                                const p = Math.min(99, (current / duration) * 100);
                                return acc + p;
                            }
                            return acc;
                        }, 0);
                        
                        const percent = total === 0 ? 0 : Math.round(totalProgressValue / total);

                        return (
                            <div 
                                key={list.id} 
                                onClick={() => onNavigate('list_detail', { listId: list.id })}
                                className="bg-gray-800 rounded-xl p-4 flex items-start space-x-4 border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer group active:scale-[0.98] transform"
                            >
                                {/* Circular Progress */}
                                <div className="relative w-14 h-14 flex-shrink-0">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-700" />
                                        <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className={`text-purple-500 transition-all duration-1000 ease-out`} strokeDasharray={150} strokeDashoffset={150 - (150 * percent) / 100} />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{percent}%</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg group-hover:text-purple-400 transition-colors truncate">{list.title}</h3>
                                    
                                    {tab === 'saved' && (
                                         <p className="text-[10px] text-gray-500 mb-1 truncate">
                                            <i className="fas fa-user-circle mr-1"></i>
                                            {list.creatorName}
                                         </p>
                                    )}

                                    <p className="text-xs text-gray-400 mb-2">{total} Items • {watched} Completed</p>
                                    
                                    {list.badgeReward && percent === 100 && (
                                        <div className="inline-flex items-center space-x-1 bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-1 rounded-full border border-yellow-500/30">
                                            <i className="fas fa-check-circle"></i>
                                            <span>Badge Earned</span>
                                        </div>
                                    )}
                                    {list.badgeReward && percent < 100 && (
                                        <div className="inline-flex items-center space-x-1 bg-gray-700 text-gray-500 text-[10px] px-2 py-1 rounded-full">
                                            <i className="fas fa-question-circle"></i>
                                            <span>Reward Hidden</span>
                                        </div>
                                    )}
                                </div>
                                <i className="fas fa-chevron-right text-gray-600 self-center"></i>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};