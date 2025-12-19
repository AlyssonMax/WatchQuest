
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { ActivityItem } from '../types';

export const ActivityScreen: React.FC<{ onNavigate: (tab: string, params?: any) => void }> = ({ onNavigate }) => {
    const [feed, setFeed] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadActivity();
    }, []);

    const loadActivity = async () => {
        setLoading(true);
        const data = await db.getActivityFeed();
        setFeed(data);
        setLoading(false);
    };

    const formatTime = (ts: number) => {
        const diff = Date.now() - ts;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(ts).toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="p-4 border-b border-gray-700 bg-gray-900/90 backdrop-blur sticky top-0 z-10">
                <h2 className="text-2xl font-bold flex items-center">
                    <i className="fas fa-bolt text-yellow-500 mr-2"></i> Activity
                </h2>
                <p className="text-xs text-gray-400">Updates from people you follow</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading activity...</div>
                ) : feed.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                        <i className="fas fa-user-friends text-4xl mb-4 opacity-30"></i>
                        <p className="mb-2">No recent activity.</p>
                        <button onClick={() => onNavigate('discover')} className="text-purple-400 text-sm font-bold hover:underline">
                            Find people to follow
                        </button>
                    </div>
                ) : (
                    feed.map(item => (
                        <div key={item.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden animate-fade-in">
                            {/* Header */}
                            <div className="p-3 flex items-center border-b border-gray-700/50 bg-gray-800/50">
                                <img 
                                    src={item.user.avatar} 
                                    className="w-8 h-8 rounded-full border border-gray-600 mr-3 cursor-pointer"
                                    onClick={() => onNavigate('profile', { userId: item.user.id })}
                                />
                                <div className="flex-1">
                                    <p className="text-sm text-gray-200">
                                        <span className="font-bold cursor-pointer hover:text-purple-400 transition-colors" onClick={() => onNavigate('profile', { userId: item.user.id })}>
                                            {item.user.name}
                                        </span>
                                        <span className="text-gray-400 ml-1">
                                            {item.type === 'list_created' ? 'created a new list' : 'earned a new badge'}
                                        </span>
                                    </p>
                                    <p className="text-[10px] text-gray-500">{formatTime(item.timestamp)}</p>
                                </div>
                            </div>

                            {/* Content */}
                            {item.type === 'list_created' && (
                                <div 
                                    className="p-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
                                    onClick={() => onNavigate('list_detail', { listId: item.data.id })}
                                >
                                    <div className="flex gap-3">
                                        {/* Mini Poster Stack - Updated to use li.media */}
                                        <div className="flex -space-x-4 overflow-hidden w-20 flex-shrink-0">
                                            {item.data.items.slice(0, 2).map((li: any, idx: number) => (
                                                <img 
                                                    key={idx} 
                                                    src={li.media.poster} 
                                                    className="w-10 h-14 rounded shadow-lg object-cover border border-gray-800" 
                                                />
                                            ))}
                                            {item.data.items.length === 0 && (
                                                <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center">
                                                    <i className="fas fa-film text-gray-500"></i>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h4 className="font-bold text-base text-white truncate">{item.data.title}</h4>
                                            <p className="text-xs text-gray-400 line-clamp-1">{item.data.description || 'No description'}</p>
                                            <div className="mt-2 flex items-center text-[10px] text-gray-500">
                                                <span className="bg-purple-900/30 text-purple-400 px-1.5 py-0.5 rounded mr-2 uppercase tracking-wide font-bold">{item.data.category}</span>
                                                <span>{item.data.items.length} items</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <i className="fas fa-chevron-right text-gray-600"></i>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {item.type === 'badge_earned' && (
                                <div className="p-4 flex items-center bg-gradient-to-r from-yellow-900/10 to-transparent">
                                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500 mr-4 border border-yellow-500/30 flex-shrink-0">
                                        <i className={`fas ${item.data.icon} text-xl`}></i>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-yellow-500">{item.data.name}</h4>
                                        <p className="text-xs text-gray-400">{item.data.description}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
