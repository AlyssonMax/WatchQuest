
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { Notification, User } from '../types';

export const NotificationsScreen: React.FC<{ onNavigate: (tab: string, params?: any) => void }> = ({ onNavigate }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        const n = await db.getNotifications();
        const u = await db.getCurrentUser();
        setNotifications(n);
        setUser(u);
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'admin_response': return { icon: 'fa-shield-halved', color: 'text-blue-400', bg: 'bg-blue-400/10' };
            case 'strike_alert': return { icon: 'fa-gavel', color: 'text-red-500', bg: 'bg-red-500/10' };
            case 'like': return { icon: 'fa-heart', color: 'text-pink-500', bg: 'bg-pink-500/10' };
            default: return { icon: 'fa-bell', color: 'text-purple-400', bg: 'bg-purple-400/10' };
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 backdrop-blur sticky top-0 z-20">
                <h2 className="text-xl font-bold">Notificações</h2>
                <button onClick={async () => { await db.markAllNotificationsRead(); load(); }} className="text-xs text-purple-400 font-bold">Marcar lidas</button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {notifications.map(n => {
                    const style = getIcon(n.type);
                    return (
                        <div key={n.id} className={`flex items-start p-3 rounded-xl border transition-colors ${n.isRead ? 'bg-transparent border-transparent' : 'bg-gray-800/50 border-gray-700'}`}>
                            <div className="relative mr-3">
                                <img src={n.actorAvatar} className="w-10 h-10 rounded-full object-cover border border-gray-700" />
                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${style.bg} flex items-center justify-center border border-gray-900`}>
                                    <i className={`fas ${style.icon} text-[10px] ${style.color}`}></i>
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-200">
                                    <span className="font-bold">{n.actorName}</span>
                                    {n.type === 'admin_response' ? ' respondeu sua denúncia.' : 
                                     n.type === 'strike_alert' ? ' aplicou uma advertência na sua conta.' : ' interagiu com você.'}
                                </p>
                                {n.targetPreview && <p className="text-xs text-gray-500 mt-1 italic">"{n.targetPreview}"</p>}
                                <p className="text-[10px] text-gray-600 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* PAINEL DE SEGURANÇA (STRIKES) */}
            {user && user.strikes.length > 0 && (
                <div className="bg-red-950/20 border-t border-red-900/40 p-4 pb-24 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-red-500 uppercase tracking-widest flex items-center">
                            <i className="fas fa-exclamation-triangle mr-2"></i> Advertências Ativas ({user.strikes.length}/3)
                        </h3>
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Sistema Disciplinar</span>
                    </div>
                    
                    {user.strikes.map(strike => (
                        <div key={strike.id} className="bg-black/50 rounded-xl p-3 border border-red-900/20">
                            <p className="text-xs text-gray-200 font-bold mb-1">Motivo: {strike.reason}</p>
                            <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase">
                                <span>Aplicado: {new Date(strike.timestamp).toLocaleDateString()}</span>
                                <span className="text-red-400">Expira em: {new Date(strike.expiresAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                    
                    {user.strikes.length === 2 && (
                        <div className="p-2 bg-red-600 text-white text-[10px] font-bold text-center rounded-lg animate-pulse">
                            CUIDADO: PRÓXIMO STRIKE RESULTARÁ EM BANIMENTO DEFINITIVO.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
