import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { MediaList, User } from '../types';

interface DiscoverScreenProps {
    onNavigate: (tab: string, params?: any) => void;
}

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ onNavigate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState<'lists' | 'users'>('lists');
    const [lists, setLists] = useState<MediaList[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const performSearch = async () => {
            if (searchTerm.length < 2) {
                setLists([]);
                setUsers([]);
                return;
            }

            setIsSearching(true);
            try {
                if (searchType === 'lists') {
                    const results = await db.searchLists(searchTerm);
                    setLists(results);
                } else {
                    const results = await db.searchUsers(searchTerm);
                    setUsers(results);
                }
            } finally {
                setIsSearching(false);
            }
        };

        const timeout = setTimeout(performSearch, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm, searchType]);

    return (
        <div className="p-4 h-full flex flex-col">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
                <i className="fas fa-compass text-purple-500 mr-2"></i> Discover
            </h2>

            {/* Search Input */}
            <div className="relative mb-4">
                <i className="fas fa-search absolute left-3 top-3.5 text-gray-500"></i>
                <input 
                    type="text" 
                    placeholder={`Search ${searchType}...`} 
                    className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>

            {/* Toggle */}
            <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700 mb-6">
                <button 
                    onClick={() => { setSearchType('lists'); setSearchTerm(''); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${searchType === 'lists' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    Lists
                </button>
                <button 
                    onClick={() => { setSearchType('users'); setSearchTerm(''); }}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${searchType === 'users' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    Users
                </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                {isSearching ? (
                    <div className="text-center text-gray-500 py-10"><i className="fas fa-circle-notch fa-spin mr-2"></i> Searching...</div>
                ) : searchTerm.length < 2 ? (
                     <div className="text-center text-gray-600 py-20 flex flex-col items-center">
                        <i className="fas fa-search text-4xl mb-3 opacity-20"></i>
                        <p>Type to explore the community</p>
                    </div>
                ) : (
                    <>
                        {searchType === 'lists' && lists.length === 0 && <div className="text-center text-gray-500">No lists found.</div>}
                        {searchType === 'users' && users.length === 0 && <div className="text-center text-gray-500">No users found.</div>}

                        {searchType === 'lists' && lists.map(list => (
                            <div 
                                key={list.id} 
                                onClick={() => onNavigate('list_detail', { listId: list.id })}
                                className="bg-gray-800 p-3 rounded-xl border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer flex items-center"
                            >
                                <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mr-3 font-bold text-gray-500">
                                    {list.badgeReward?.icon ? <i className={`fas ${list.badgeReward.icon}`}></i> : 'LIST'}
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-white">{list.title}</h4>
                                    <p className="text-xs text-gray-400">by {list.creatorName} • {list.items.length} items</p>
                                </div>
                                <i className="fas fa-chevron-right ml-auto text-gray-600"></i>
                            </div>
                        ))}

                        {searchType === 'users' && users.map(user => (
                            <div 
                                key={user.id} 
                                onClick={() => onNavigate('profile', { userId: user.id })}
                                className="bg-gray-800 p-3 rounded-xl border border-gray-700 flex items-center cursor-pointer hover:border-purple-500 transition-colors"
                            >
                                <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-600 mr-3" />
                                <div>
                                    <h4 className="font-bold text-sm text-white">{user.name}</h4>
                                    <p className="text-xs text-gray-400">{user.handle}</p>
                                </div>
                                <div className="ml-auto bg-gray-700 text-xs px-2 py-1 rounded text-gray-300">
                                    {user.followers} Followers
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
};