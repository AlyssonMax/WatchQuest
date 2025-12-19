
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { NotificationSettings } from '../types';

export const SettingsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [settings, setSettings] = useState<NotificationSettings>({ likes: true, comments: true, follows: true, mentions: true });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showConfirmReset, setShowConfirmReset] = useState(false);

    useEffect(() => {
        const load = async () => {
            const user = await db.getCurrentUser();
            if (user && user.notificationSettings) {
                setSettings(user.notificationSettings);
            }
            setLoading(false);
        };
        load();
    }, []);

    const toggle = (key: keyof NotificationSettings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setSaving(true);
        await db.updateNotificationSettings(settings);
        setSaving(false);
        onBack();
    };

    const handleReset = async () => {
        await db.resetData();
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className="p-4 border-b border-gray-700 flex items-center bg-gray-900/90 backdrop-blur sticky top-0 z-10">
                <button onClick={onBack} className="mr-4 text-gray-400 hover:text-white">
                    <i className="fas fa-arrow-left text-xl"></i>
                </button>
                <h2 className="text-xl font-bold">Configurações</h2>
            </div>

            <div className="p-4 space-y-6">
                <div>
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Notificações Push</h3>
                    <div className="space-y-4 bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <ToggleRow 
                            label="Novos Seguidores" 
                            desc="Notificar quando alguém seguir você" 
                            icon="fa-user-plus" 
                            active={settings.follows} 
                            onToggle={() => toggle('follows')} 
                        />
                        <ToggleRow 
                            label="Curtidas e Reações" 
                            desc="Notificar quando curtirem sua lista" 
                            icon="fa-heart" 
                            active={settings.likes} 
                            onToggle={() => toggle('likes')} 
                        />
                         <ToggleRow 
                            label="Comentários" 
                            desc="Notificar quando comentarem em sua lista" 
                            icon="fa-comment" 
                            active={settings.comments} 
                            onToggle={() => toggle('comments')} 
                        />
                        <ToggleRow 
                            label="Menções" 
                            desc="Notificar quando mencionarem você (@user)" 
                            icon="fa-at" 
                            active={settings.mentions} 
                            onToggle={() => toggle('mentions')} 
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4">Gerenciamento de Dados</h3>
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-4">
                        {!showConfirmReset ? (
                            <button 
                                onClick={() => setShowConfirmReset(true)}
                                className="w-full py-3 rounded-lg border border-red-900/50 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-900/10 transition-colors"
                            >
                                Reset Local Data
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <button 
                                    onClick={handleReset}
                                    className="w-full py-3 rounded-lg bg-red-600 text-white text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-900/20 hover:bg-red-500 transition-colors"
                                >
                                    Confirmar Reset Total
                                </button>
                                <button 
                                    onClick={() => setShowConfirmReset(false)}
                                    className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}
                        <p className="text-[10px] text-gray-500 leading-relaxed text-center px-2 italic">
                            Esta ação apagará permanentemente todos os dados armazenados neste navegador, incluindo suas listas criadas e histórico de visualização. Esta ação não pode ser desfeita.
                        </p>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-colors flex items-center justify-center mt-4"
                >
                    {saving ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : null}
                    Salvar Preferências
                </button>
            </div>
        </div>
    );
};

const ToggleRow: React.FC<{ label: string, desc: string, icon: string, active: boolean, onToggle: () => void }> = ({ label, desc, icon, active, onToggle }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${active ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-500'}`}>
                <i className={`fas ${icon}`}></i>
            </div>
            <div>
                <p className="font-bold text-sm text-gray-200">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>
        </div>
        <button 
            onClick={onToggle}
            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${active ? 'bg-purple-600' : 'bg-gray-600'}`}
        >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${active ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </button>
    </div>
);
