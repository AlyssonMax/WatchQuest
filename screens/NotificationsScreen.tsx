import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Notification } from '../types';

interface NotificationsScreenProps {
    onNavigate: (tab: string, params?: any) => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onNavigate }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await db.getNotifications();
        setNotifications(data);
        setLoading(false);
    };

    const handleMarkRead = async () => {
        await db.markAllNotificationsRead();
        setNotifications(prev => prev.map(n => ({...n, isRead: true})));
    };

    const handleNotificationClick = (n: Notification) => {
        // Mark as read locally if not already
        if (!n.isRead) {
            // In a real app we'd mark just this one as read
            // For now, we update local state visually
        }
        
        if (n.type === 'follow') {
            onNavigate('profile', { userId: n.actorId });
        } else if (n.targetId) {
            onNavigate('list_detail', { listId: n.targetId });
        }
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'like': return { icon: 'fa-heart', color: 'text-pink-500', bg: 'bg-pink-500/10' };
            case 'comment': return { icon: 'fa-comment', color: 'text-blue-500', bg: 'bg-blue-500/10' };
            case 'mention': return { icon: 'fa-at', color: 'text-purple-500', bg: 'bg-purple-500/10' };
            case 'follow': return { icon: 'fa-user-plus', color: 'text-green-500', bg: 'bg-green-500/10' };
            default: return { icon: 'fa-bell', color: 'text-gray-400', bg: 'bg-gray-800' };
        }
    };

    const formatTime = (ts: number) => {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(ts).toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
             <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900/90 backdrop-blur sticky top-0 z-10">
                <h2 className="text-xl font-bold">Notifications</h2>
                <button onClick={handleMarkRead} className="text-xs text-purple-400 font-bold hover:text-purple-300">
                    Mark all read
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 pb-20">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-bell-slash text-2xl opacity-50"></i>
                        </div>
                        <p>No notifications yet.</p>
                    </div>
                ) : (
                    notifications.map(item => {
                        const style = getIcon(item.type);
                        return (
                            <div 
                                key={item.id} 
                                onClick={() => handleNotificationClick(item)}
                                className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${item.isRead ? 'bg-gray-900 border-transparent' : 'bg-gray-800/50 border-gray-700'}`}
                            >
                                <div className="relative mr-3">
                                    <img src={item.actorAvatar} className="w-10 h-10 rounded-full object-cover" />
                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${style.bg} flex items-center justify-center border border-gray-900`}>
                                        <i className={`fas ${style.icon} text-[10px] ${style.color}`}></i>
                                    </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-200">
                                        <span className="font-bold">{item.actorName}</span>
                                        {' '}
                                        {item.type === 'like' && `liked your list`}
                                        {item.type === 'comment' && `commented on`}
                                        {item.type === 'mention' && `mentioned you in`}
                                        {item.type === 'follow' && `started following you`}
                                        {' '}
                                        {item.targetPreview && <span className="font-bold text-gray-400">"{item.targetPreview}"</span>}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">{formatTime(item.timestamp)}</p>
                                </div>
                                
                                {!item.isRead && <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 ml-2"></div>}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
