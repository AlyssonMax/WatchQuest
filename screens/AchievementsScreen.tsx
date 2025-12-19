
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { SYSTEM_BADGES } from '../services/mockData';
import { User } from '../types';

interface AchievementRow {
    id: string;
    def: any;
    current: number;
    target: number;
    unlocked: boolean;
    earnedDate?: string;
}

export const AchievementsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [achievements, setAchievements] = useState<AchievementRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Fix: Changed db.getUser() (which requires an ID) to db.getCurrentUser()
            const u = await db.getCurrentUser();
            if (!u) {
                setLoading(false);
                return;
            }
            const stats = await db.getAchievementStats(u.id);
            setUser(u);

            const allBadges = Object.values(SYSTEM_BADGES);
            const rows: AchievementRow[] = allBadges.map(badge => {
                let current = 0;
                let target = 0;
                
                // Logic Mapping (Must match db.ts checkAchievements)
                if (badge.id === SYSTEM_BADGES.CREATOR_NOVICE.id) { current = stats.listsCreated; target = 1; }
                else if (badge.id === SYSTEM_BADGES.CREATOR_MASTER.id) { current = stats.listsCreated; target = 5; }
                else if (badge.id === SYSTEM_BADGES.LIB_BUILDER_10.id) { current = stats.moviesAdded; target = 10; }
                else if (badge.id === SYSTEM_BADGES.SOCIAL_FAN.id) { current = stats.likesGiven; target = 5; }
                else if (badge.id === SYSTEM_BADGES.INFLUENCER_10.id) { current = stats.followers; target = 10; }
                else if (badge.id === SYSTEM_BADGES.VETERAN_1Y.id) { current = stats.daysJoined; target = 365; }

                // Cap current at target for display purposes if unlocked
                const earnedBadge = u.badges.find(b => b.id === badge.id);
                const unlocked = !!earnedBadge;
                
                return {
                    id: badge.id,
                    def: badge,
                    current: current,
                    target: target,
                    unlocked: unlocked,
                    earnedDate: earnedBadge?.earnedDate
                };
            });

            setAchievements(rows);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading badges...</div>;

    const totalUnlocked = achievements.filter(a => a.unlocked).length;
    const totalBadges = achievements.length;

    return (
        <div className="h-full flex flex-col bg-gray-900">
             {/* Header */}
             <div className="p-4 bg-gray-800/80 backdrop-blur-md border-b border-gray-700 flex items-center sticky top-0 z-10">
                <button onClick={onBack} className="mr-4 text-gray-400 hover:text-white">
                    <i className="fas fa-arrow-left text-xl"></i>
                </button>
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-yellow-500">Badge Gallery</h2>
                    <p className="text-xs text-gray-400">{totalUnlocked} / {totalBadges} Unlocked</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                {achievements.map((item) => {
                    const progressPercent = Math.min(100, Math.round((item.current / item.target) * 100));
                    
                    return (
                        <div key={item.id} className={`bg-gray-800 border ${item.unlocked ? 'border-yellow-500/50' : 'border-gray-700'} rounded-xl p-4 flex items-center relative overflow-hidden`}>
                            {/* Icon */}
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mr-4 flex-shrink-0 ${item.unlocked ? 'bg-yellow-500/20 text-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-gray-700 text-gray-500 grayscale'}`}>
                                <i className={`fas ${item.def.icon}`}></i>
                            </div>

                            {/* Details */}
                            <div className="flex-1 z-10">
                                <div className="flex justify-between items-start">
                                    <h3 className={`font-bold ${item.unlocked ? 'text-white' : 'text-gray-400'}`}>{item.def.name}</h3>
                                    {item.unlocked && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/30">Earned</span>}
                                </div>
                                <p className="text-xs text-gray-400 mb-2">{item.def.description}</p>
                                
                                {/* Progress Bar */}
                                <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                                    <div 
                                        className={`h-2 rounded-full transition-all duration-1000 ${item.unlocked ? 'bg-yellow-500' : 'bg-gray-500'}`} 
                                        style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                                    <span>{item.current} / {item.target}</span>
                                    <span>{progressPercent}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
