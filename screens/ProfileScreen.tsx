
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { User, BadgeType, UserRole, MediaList, WatchStatus, Badge } from '../types';
import { compressImage } from '../services/imageUtils';

interface ProfileScreenProps {
    viewUserId?: string | null;
    onLogout: () => void;
    onAdminClick: () => void;
    onNavigate: (tab: string, params?: any) => void;
}

interface PatchDisplay {
    id: string;
    listId: string;
    name: string;
    icon: string;
    progress: number;
    isComplete: boolean;
    source: 'creator' | 'earner' | 'viewer_progress';
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ viewUserId, onLogout, onAdminClick, onNavigate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [patchCollection, setPatchCollection] = useState<PatchDisplay[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);

    // Follower/Following Modal State
    const [showFollowModal, setShowFollowModal] = useState(false);
    const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');
    const [modalUsers, setModalUsers] = useState<User[]>([]);
    const [loadingModal, setLoadingModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeUploadField, setActiveUploadField] = useState<'avatar' | 'coverImage' | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});

    useEffect(() => {
        loadData();
    }, [viewUserId]);

    const loadData = async () => {
        try {
            const me = await db.getCurrentUser();
            setCurrentUser(me);

            const targetId = viewUserId || me?.id;
            if (targetId) {
                const user = await db.getUserById(targetId);
                setProfileUser(user || null);
                setEditForm(user || {});
                
                if (me && me.id !== targetId) {
                    setIsFollowing(me.followingIds?.includes(targetId) || false);
                }

                const lists = await db.getUserLists(targetId);
                const collection: PatchDisplay[] = [];

                for (const list of lists) {
                    if (list.badgeReward) {
                        const progress = await db.calculateListProgress(list);
                        collection.push({
                            id: list.id,
                            listId: list.id,
                            name: list.title,
                            icon: list.badgeReward.icon,
                            progress: progress, 
                            isComplete: progress === 100,
                            source: 'creator'
                        });
                    }
                }

                user?.badges.filter(b => b.type === BadgeType.COMMUNITY).forEach(badge => {
                    if (badge.relatedListId && !collection.find(c => c.listId === badge.relatedListId)) {
                        collection.push({
                            id: badge.id,
                            listId: badge.relatedListId,
                            name: badge.name, 
                            icon: badge.icon,
                            progress: 100,
                            isComplete: true,
                            source: 'earner'
                        });
                    }
                });

                setPatchCollection(collection);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleFollowToggle = async () => {
        if (!currentUser || !profileUser) return;
        const newStatus = !isFollowing;
        setIsFollowing(newStatus);
        setProfileUser(prev => prev ? ({ ...prev, followers: newStatus ? prev.followers + 1 : prev.followers - 1 }) : null);

        try {
            if (!newStatus) await db.unfollowUser(profileUser.id);
            else await db.followUser(profileUser.id);
        } catch (e) {
            setIsFollowing(!newStatus);
        }
    };

    const handleSave = async () => {
        if (!profileUser) return;
        setIsSaving(true);
        try {
            const updated = await db.updateUser(profileUser.id, editForm);
            setProfileUser(updated);
            setIsEditing(false);
        } catch (e) {
            alert('Save failed.');
        } finally {
            setIsSaving(false);
        }
    };

    const triggerFileUpload = (field: 'avatar' | 'coverImage') => {
        setActiveUploadField(field);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && activeUploadField) {
            const compressed = await compressImage(file);
            setEditForm(prev => ({ ...prev, [activeUploadField]: compressed }));
        }
    };

    const openFollowModal = async (type: 'followers' | 'following') => {
        if (!profileUser) return;
        setFollowModalType(type);
        setLoadingModal(true);
        setShowFollowModal(true);
        try {
            const list = type === 'followers' ? await db.getFollowers(profileUser.id) : await db.getFollowing(profileUser.id);
            setModalUsers(list);
        } finally {
            setLoadingModal(false);
        }
    };

    const isImageUrl = (icon: string) => icon.startsWith('data:') || icon.startsWith('http');

    if (!profileUser) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

    const isOwnProfile = currentUser?.id === profileUser.id;
    const officialBadges = profileUser.badges.filter(b => b.type === BadgeType.OFFICIAL);

    return (
        <div className="pb-8">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            
            <div className="relative group">
                <div className="h-40 relative bg-gray-800 overflow-hidden">
                    {profileUser.coverImage ? (
                        <img src={profileUser.coverImage} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-800 to-indigo-900"></div>
                    )}
                    {isEditing && (
                        <button onClick={() => triggerFileUpload('coverImage')} className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                            <i className="fas fa-image text-xl"></i>
                        </button>
                    )}
                </div>
                <div className="absolute -bottom-12 left-4">
                    <div className="relative w-24 h-24">
                        <img src={isEditing ? editForm.avatar : profileUser.avatar} className="w-full h-full rounded-full border-4 border-gray-900 shadow-xl object-cover bg-gray-800" />
                        {isEditing && (
                            <button onClick={() => triggerFileUpload('avatar')} className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white">
                                <i className="fas fa-camera text-lg"></i>
                            </button>
                        )}
                    </div>
                </div>
                <div className="absolute bottom-4 right-4 flex space-x-2">
                     {isOwnProfile ? (
                         !isEditing ? (
                             <button onClick={() => setIsEditing(true)} className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10">Edit</button>
                         ) : (
                             <div className="flex space-x-2">
                                 <button onClick={() => setIsEditing(false)} className="bg-red-600/80 px-3 py-1.5 rounded-full text-xs font-semibold">Cancel</button>
                                 <button onClick={handleSave} disabled={isSaving} className="bg-green-600/80 px-3 py-1.5 rounded-full text-xs font-semibold">Save</button>
                             </div>
                         )
                     ) : (
                         <button onClick={handleFollowToggle} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isFollowing ? 'bg-gray-700' : 'bg-purple-600 shadow-lg'}`}>
                            {isFollowing ? 'Following' : 'Follow'}
                         </button>
                     )}
                </div>
            </div>

            <div className="pt-14 px-4">
                {!isEditing ? (
                    <>
                        <h1 className="text-2xl font-bold">{profileUser.name}</h1>
                        <p className="text-gray-400 text-sm">{profileUser.handle}</p>
                        <p className="mt-3 text-sm text-gray-300">{profileUser.bio}</p>
                    </>
                ) : (
                    <div className="space-y-3">
                        <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                        <textarea className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm h-20 text-white" value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} />
                    </div>
                )}
                
                <div className="flex justify-between mt-6 bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-center flex-1" onClick={() => openFollowModal('followers')}>
                        <span className="block font-bold text-lg">{profileUser.followers}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Followers</span>
                    </div>
                    <div className="text-center flex-1" onClick={() => openFollowModal('following')}>
                        <span className="block font-bold text-lg">{profileUser.following}</span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Following</span>
                    </div>
                </div>
            </div>

            {/* Official Achievements Section */}
            <div className="mt-8 px-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center">
                        <i className="fas fa-award mr-2 text-yellow-500"></i> Official Achievements
                    </h3>
                    {/* READICIONADO O LINK PARA A GALERIA */}
                    <button onClick={() => onNavigate('achievements')} className="text-[10px] text-purple-400 font-black uppercase tracking-widest hover:underline">
                        View Gallery
                    </button>
                </div>
                {officialBadges.length === 0 ? (
                     <p className="text-gray-600 text-xs italic">No achievements yet.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {officialBadges.map(badge => (
                            <div key={badge.id} className="bg-gray-800 border border-yellow-500/20 p-3 rounded-2xl flex items-center space-x-3">
                                <div className="w-10 h-10 flex-shrink-0 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-500">
                                    {isImageUrl(badge.icon) ? <img src={badge.icon} className="w-full h-full object-contain" /> : <i className={`fas ${badge.icon} text-xl`}></i>}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black text-white truncate">{badge.name}</p>
                                    <p className="text-[8px] text-gray-500 font-bold uppercase">{badge.earnedDate}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Patches Collection */}
             <div className="mt-8 px-4">
                <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center">
                    <i className="fas fa-layer-group mr-2 text-purple-500"></i> Collection Patches
                </h3>
                {patchCollection.length === 0 ? (
                     <p className="text-gray-600 text-xs italic">No patches yet.</p>
                ) : (
                    <div className="grid grid-cols-4 gap-4">
                        {patchCollection.map(patch => (
                            <div 
                                key={patch.id} 
                                className="flex flex-col items-center group cursor-pointer"
                                onClick={() => onNavigate('list_detail', { listId: patch.listId })}
                            >
                                <div className="relative w-16 h-16">
                                     <div className={`w-full h-full rounded-full overflow-hidden transition-all duration-500 ${!patch.isComplete ? 'grayscale brightness-[0.2] opacity-70' : 'drop-shadow-[0_0_12px_rgba(168,85,247,0.6)] scale-105'}`}>
                                        {isImageUrl(patch.icon) ? (
                                            <img src={patch.icon} className="w-full h-full object-contain" />
                                        ) : (
                                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                                <i className={`fas ${patch.icon} text-gray-400`}></i>
                                            </div>
                                        )}
                                     </div>
                                     {!patch.isComplete && (
                                         <div className="absolute inset-0 flex items-center justify-center">
                                             <span className="text-white text-[10px] font-black drop-shadow-md">{patch.progress}%</span>
                                         </div>
                                     )}
                                </div>
                                <div className="text-[9px] text-gray-400 mt-2 text-center truncate w-full uppercase font-bold">{patch.name}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isOwnProfile && (
                <div className="mt-8 px-4 space-y-3">
                    {profileUser.role === UserRole.ADMIN && (
                        <button onClick={onAdminClick} className="w-full py-3 rounded-xl bg-red-900/20 border border-red-700 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-900/30 transition-all">Admin Unit</button>
                    )}
                    <button onClick={onLogout} className="w-full py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-xs font-bold uppercase tracking-widest hover:bg-gray-750">Terminate Session</button>
                </div>
            )}
            
            {/* Follow Modal */}
            {showFollowModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[70vh]">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800">
                            <h3 className="font-bold text-lg capitalize">{followModalType}</h3>
                            <button onClick={() => setShowFollowModal(false)} className="text-gray-400"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingModal ? (
                                <div className="text-center py-10 text-gray-500"><i className="fas fa-circle-notch fa-spin"></i></div>
                            ) : (
                                <div className="space-y-2">
                                    {modalUsers.map(u => (
                                        <div key={u.id} onClick={() => { setShowFollowModal(false); onNavigate('profile', { userId: u.id }); }} className="flex items-center p-2 rounded-xl hover:bg-gray-800 cursor-pointer">
                                            <img src={u.avatar} className="w-10 h-10 rounded-full object-cover mr-3 border border-gray-700" />
                                            <div><p className="font-bold text-sm text-white">{u.name}</p><p className="text-xs text-gray-400">{u.handle}</p></div>
                                            <i className="fas fa-chevron-right ml-auto text-gray-700 text-xs"></i>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
