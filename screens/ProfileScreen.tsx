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
                const user = await db.getUser(targetId);
                setProfileUser(user);
                setEditForm(user);
                
                // Determine follow status
                if (me && me.id !== targetId) {
                    setIsFollowing(me.followingIds?.includes(targetId) || false);
                }

                // Load Lists for this user
                const lists = await db.getUserLists(targetId);
                
                // Construct Patch Collection
                const collection: PatchDisplay[] = [];

                // 1. Lists Created by Profile Owner
                lists.forEach(list => {
                    let progress = 0;
                    let isComplete = false;
                    
                    if (me) {
                        progress = db.calculateListProgress(list, me);
                        isComplete = progress === 100;
                    }

                    collection.push({
                        id: list.id,
                        listId: list.id,
                        name: list.title,
                        icon: list.badgeReward?.icon || 'fa-certificate',
                        progress: progress, 
                        isComplete: isComplete,
                        source: 'creator'
                    });
                });

                // 2. Earned Patches from others (Badges in user profile)
                const earnedPatches = user.badges.filter(b => b.type === BadgeType.COMMUNITY);
                earnedPatches.forEach(badge => {
                    if (badge.relatedListId) {
                        if (!collection.find(c => c.listId === badge.relatedListId)) {
                             collection.push({
                                id: badge.id,
                                listId: badge.relatedListId,
                                name: badge.name.replace(' Patch', '').replace(' Master', ''), 
                                icon: badge.icon,
                                progress: 100,
                                isComplete: true,
                                source: 'earner'
                            });
                        }
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
        setIsFollowing(!isFollowing);
        setProfileUser(prev => prev ? ({
            ...prev, 
            followers: isFollowing ? prev.followers - 1 : prev.followers + 1 
        }) : null);

        try {
            if (isFollowing) await db.unfollowUser(profileUser.id);
            else await db.followUser(profileUser.id);
        } catch (e) {
            setIsFollowing(!isFollowing);
            alert("Action failed.");
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
            alert('Failed to save profile. Storage might be full.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        await db.logout();
        onLogout();
    };

    const triggerFileUpload = (field: 'avatar' | 'coverImage') => {
        setActiveUploadField(field);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !activeUploadField) return;

        try {
            const compressedBase64 = await compressImage(file);
            setEditForm(prev => ({ ...prev, [activeUploadField]: compressedBase64 }));
        } catch (error) {
            alert("Error processing image.");
        }
    };

    const openFollowModal = async (type: 'followers' | 'following') => {
        if (!profileUser) return;
        setFollowModalType(type);
        setLoadingModal(true);
        setShowFollowModal(true);
        
        try {
            const list = type === 'followers' 
                ? await db.getFollowers(profileUser.id)
                : await db.getFollowing(profileUser.id);
            setModalUsers(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingModal(false);
        }
    };

    if (!profileUser) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

    const isOwnProfile = currentUser?.id === profileUser.id;
    const officialBadges = profileUser.badges.filter(b => b.type === BadgeType.OFFICIAL);

    return (
        <div className="pb-8">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            
            {!isOwnProfile && (
                <div className="absolute top-4 left-4 z-20">
                    <button onClick={() => onNavigate('discover')} className="bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/60">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                </div>
            )}
            
            {/* Settings Button */}
             {isOwnProfile && (
                <div className="absolute top-4 right-4 z-20">
                    <button onClick={() => onNavigate('settings')} className="bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/60">
                        <i className="fas fa-cog"></i>
                    </button>
                </div>
            )}

            {/* Profile Header & Edit Logic */}
            <div className="relative group">
                <div className="h-40 relative bg-gray-800 overflow-hidden">
                    {editForm.coverImage ? (
                        <img src={editForm.coverImage} className={`w-full h-full object-cover transition-opacity ${isEditing ? 'opacity-70' : ''}`} />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-800 to-indigo-900"></div>
                    )}
                    {isEditing && (
                        <button onClick={() => triggerFileUpload('coverImage')} className="absolute inset-0 flex items-center justify-center bg-black/40 text-white cursor-pointer hover:bg-black/50 transition-colors">
                            <i className="fas fa-image text-xl"></i>
                        </button>
                    )}
                </div>
                <div className="absolute -bottom-12 left-4">
                    <div className="relative w-24 h-24">
                        <img src={editForm.avatar} className={`w-full h-full rounded-full border-4 border-gray-900 shadow-xl object-cover bg-gray-800 ${isEditing ? 'opacity-80' : ''}`} />
                        {isEditing && (
                            <button onClick={() => triggerFileUpload('avatar')} className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white cursor-pointer hover:bg-black/50 transition-colors z-10">
                                <i className="fas fa-camera text-lg"></i>
                            </button>
                        )}
                    </div>
                </div>
                <div className="absolute bottom-4 right-4 flex space-x-2 z-10">
                     {isOwnProfile ? (
                         !isEditing ? (
                             <button onClick={() => setIsEditing(true)} className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 hover:bg-white/10">
                                Edit Profile
                             </button>
                         ) : (
                             <div className="flex space-x-2">
                                 <button onClick={() => { setIsEditing(false); setEditForm(profileUser); }} className="bg-red-600/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-red-600">Cancel</button>
                                 <button onClick={handleSave} disabled={isSaving} className="bg-green-600/80 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-green-600">Save</button>
                             </div>
                         )
                     ) : (
                         <button onClick={handleFollowToggle} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isFollowing ? 'bg-gray-700 border border-gray-500 text-white' : 'bg-purple-600 text-white shadow-lg'}`}>
                            {isFollowing ? 'Following' : 'Follow'}
                         </button>
                     )}
                </div>
            </div>

            <div className="pt-14 px-4">
                {!isEditing ? (
                    <>
                        <div className="flex items-center space-x-2">
                            <h1 className="text-2xl font-bold">{profileUser.name}</h1>
                            {profileUser.role === UserRole.ADMIN && (
                                <span className="bg-red-500/20 text-red-500 text-[9px] font-bold px-2 py-0.5 rounded border border-red-500/30 uppercase">Admin</span>
                            )}
                        </div>
                        <p className="text-gray-400 text-sm">{profileUser.handle} • {profileUser.country}</p>
                        <p className="mt-3 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{profileUser.bio}</p>
                    </>
                ) : (
                    <div className="space-y-3 animate-fade-in">
                        <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name" />
                        <textarea className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white resize-none h-24" value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} placeholder="Bio" />
                    </div>
                )}
                <div className="flex justify-between mt-6 bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="text-center"><span className="block font-bold text-lg">{patchCollection.length}</span><span className="text-xs text-gray-500 uppercase tracking-wide">Patches</span></div>
                    <div className="text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => openFollowModal('followers')}>
                        <span className="block font-bold text-lg text-purple-400">{profileUser.followers}</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Followers</span>
                    </div>
                    <div className="text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => openFollowModal('following')}>
                        <span className="block font-bold text-lg text-purple-400">{profileUser.following}</span>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Following</span>
                    </div>
                </div>
            </div>

            {/* Achievements Section */}
            <div className="mt-8 px-4">
                 <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-4">
                    <h3 className="text-lg font-bold flex items-center"><i className="fas fa-trophy text-yellow-500 mr-2"></i> Achievements</h3>
                    {isOwnProfile && (
                        <div onClick={() => onNavigate('achievements')} className="text-xs text-gray-400 flex items-center cursor-pointer hover:text-white">View Gallery <i className="fas fa-chevron-right ml-1"></i></div>
                    )}
                </div>
                {officialBadges.length === 0 ? (
                     <p className="text-gray-500 text-sm italic">No system achievements yet.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {officialBadges.map(badge => (
                            <div key={badge.id} className="bg-gray-800 border border-yellow-500/30 rounded-xl p-3 flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 flex items-center justify-center text-yellow-400 text-xl shadow-[0_0_15px_rgba(234,179,8,0.2)] mb-2">
                                    {badge.icon.startsWith('data:') ? <img src={badge.icon} className="w-full h-full rounded-full object-cover" /> : <i className={`fas ${badge.icon}`}></i>}
                                </div>
                                <p className="text-xs font-bold text-yellow-100">{badge.name}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

             {/* Patches Collection */}
             <div className="mt-8 px-4">
                <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-4">
                    <h3 className="text-lg font-bold flex items-center"><i className="fas fa-thumbtack text-purple-400 mr-2"></i> Patches</h3>
                </div>
                {patchCollection.length === 0 ? (
                     <p className="text-gray-500 text-sm italic">No lists created or completed yet.</p>
                ) : (
                    <div className="grid grid-cols-4 gap-4">
                        {patchCollection.map(patch => {
                            // Logic: If it's my profile, I can edit my lists (readOnly=false). 
                            // If it's someone else's, I can only view them (readOnly=true).
                            const isMyList = isOwnProfile;
                            const isLocked = patch.progress < 100;
                            
                            return (
                                <div 
                                    key={patch.id} 
                                    className="flex flex-col items-center group relative select-none"
                                    onClick={() => onNavigate('list_detail', { listId: patch.listId, readOnly: !isMyList })}
                                >
                                    <div className="relative w-16 h-16 transition-transform group-active:scale-95 cursor-pointer flex items-center justify-center">
                                         
                                         {/* Image Container - No SVG Ring */}
                                         <div className={`w-full h-full p-1 transition-all duration-500 rounded-full overflow-hidden ${isLocked ? 'grayscale brightness-[0.2] opacity-80' : 'drop-shadow-lg'}`}>
                                            {patch.icon.startsWith('data:') ? (
                                                <img src={patch.icon} className="w-full h-full object-contain" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-500">
                                                    <i className={`fas ${patch.icon} text-2xl text-gray-400`}></i>
                                                </div>
                                            )}
                                         </div>
                                         
                                         {/* Percentage Centered - Only Show if Locked */}
                                         {isLocked && (
                                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                 <span className="text-white text-xs font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                                                     {Math.round(patch.progress)}%
                                                 </span>
                                             </div>
                                         )}
                                    </div>
                                    <div className="text-[9px] text-gray-400 mt-2 text-center truncate w-full">{patch.name}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Admin & Logout Section (Own Profile Only) */}
            {isOwnProfile && (
                <div className="mt-8 px-4 space-y-3">
                    {profileUser.role === UserRole.ADMIN && (
                        <button onClick={onAdminClick} className="w-full py-3 rounded-xl bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-700 text-red-200 text-sm font-bold hover:shadow-lg transition-all"><i className="fas fa-user-shield mr-2"></i> Admin Panel</button>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                         <button onClick={handleLogout} className="w-full py-3 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 text-sm font-semibold hover:bg-gray-700 transition-colors">Logout</button>
                        <button onClick={() => { if(confirm("Reset app?")) db.resetData(); }} className="w-full py-3 rounded-xl border border-red-900/50 text-red-500 text-sm font-semibold hover:bg-red-900/20">Reset Data</button>
                    </div>
                </div>
            )}
            
            {/* Modal Logic (Followers/Following) */}
            {showFollowModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[70vh]">
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800">
                            <h3 className="font-bold text-lg capitalize">{followModalType}</h3>
                            <button onClick={() => setShowFollowModal(false)} className="text-gray-400 hover:text-white"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingModal ? (
                                <div className="text-center py-10 text-gray-500"><i className="fas fa-circle-notch fa-spin"></i></div>
                            ) : modalUsers.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 italic">No users found.</div>
                            ) : (
                                <div className="space-y-2">
                                    {modalUsers.map(u => (
                                        <div key={u.id} onClick={() => { setShowFollowModal(false); onNavigate('profile', { userId: u.id }); }} className="flex items-center p-2 rounded-xl hover:bg-gray-800 cursor-pointer transition-colors">
                                            <img src={u.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-700 mr-3" />
                                            <div><p className="font-bold text-sm text-white">{u.name}</p><p className="text-xs text-gray-400">{u.handle}</p></div>
                                            <i className="fas fa-chevron-right ml-auto text-gray-600 text-xs"></i>
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
