import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Report, User, UserRole } from '../types';
import { processPatchImage } from '../services/imageUtils';

export const AdminScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [tab, setTab] = useState<'overview' | 'users' | 'reports' | 'badges'>('overview');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        db.getCurrentUser().then(setCurrentUser);
    }, []);

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Admin Header */}
            <div className="p-4 bg-gray-800/90 backdrop-blur-md border-b border-gray-700 flex items-center justify-between shadow-lg sticky top-0 z-20">
                <div className="flex items-center">
                    <button onClick={onBack} className="mr-4 text-gray-400 hover:text-white transition-colors">
                        <i className="fas fa-arrow-left text-xl"></i>
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-red-500 tracking-tight flex items-center">
                            <i className="fas fa-user-shield mr-2"></i> Admin
                        </h2>
                        <p className="text-[10px] text-gray-400 font-mono">SYSTEM CONTROL</p>
                    </div>
                </div>
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                    <TabButton icon="fa-chart-pie" active={tab === 'overview'} onClick={() => setTab('overview')} />
                    <TabButton icon="fa-users" active={tab === 'users'} onClick={() => setTab('users')} />
                    <TabButton icon="fa-flag" active={tab === 'reports'} onClick={() => setTab('reports')} />
                    <TabButton icon="fa-award" active={tab === 'badges'} onClick={() => setTab('badges')} />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {tab === 'overview' && <OverviewTab />}
                {tab === 'users' && <UsersTab currentUser={currentUser} />}
                {tab === 'reports' && <ReportsTab />}
                {tab === 'badges' && <BadgesTab />}
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS (TABS) ---

// 0. OVERVIEW TAB (NEW)
const OverviewTab: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await db.getDashboardStats();
                setStats(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="text-center py-10 text-gray-500">Loading metrics...</div>;
    if (!stats) return null;

    // Calculate percentages for bars
    const userPercent = (stats.usersByRole.user / stats.totalUsers) * 100;
    const adminPercent = (stats.usersByRole.admin / stats.totalUsers) * 100;

    return (
        <div className="p-4 space-y-6 animate-fade-in">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
                <MetricCard label="Total Users" value={stats.totalUsers} icon="fa-users" color="text-blue-400" />
                <MetricCard label="Total Lists" value={stats.totalLists} icon="fa-list" color="text-purple-400" />
                <MetricCard label="Reactions" value={stats.totalReactions} icon="fa-heart" color="text-pink-400" />
                <MetricCard label="Comments" value={stats.totalComments} icon="fa-comment" color="text-green-400" />
            </div>

            {/* User Distribution Chart */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <h3 className="text-sm font-bold text-gray-300 mb-4">User Roles Distribution</h3>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Regular Users</span>
                            <span>{stats.usersByRole.user}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${userPercent}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Admins</span>
                            <span>{stats.usersByRole.admin}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-900 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${adminPercent}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Health Check */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-300">System Health</h3>
                    <p className="text-xs text-gray-500">Pending reports: <span className="text-white font-bold">{stats.totalReports}</span></p>
                </div>
                <div className={`w-3 h-3 rounded-full ${stats.totalReports > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            </div>
        </div>
    );
};

const MetricCard: React.FC<{ label: string, value: number, icon: string, color: string }> = ({ label, value, icon, color }) => (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col items-center justify-center">
        <i className={`fas ${icon} text-2xl ${color} mb-2`}></i>
        <span className="text-2xl font-bold text-white">{value}</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
);

// 1. USERS TAB
const UsersTab: React.FC<{ currentUser: User | null }> = ({ currentUser }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null); // For Detail Modal

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await db.getAllUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (userId: string) => {
        // Double confirmation for safety
        if (!confirm("⚠️ WARNING: This action is irreversible.\n\nAre you sure you want to DELETE this user and ALL their data?")) return;
        
        try {
            await db.adminDeleteUser(userId);
            
            // Remove from list
            setUsers(prev => prev.filter(u => u.id !== userId));
            
            // Close modal if deleting the selected user
            if (selectedUser?.id === userId) setSelectedUser(null);
            
            alert("✅ User successfully deleted.");
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    const handleResetPassword = async (userId: string) => {
        if (!confirm("Are you sure you want to reset this user's password?")) return;
        try {
            const tempPass = await db.adminResetPassword(userId);
            
            // Try to copy to clipboard
            try {
                await navigator.clipboard.writeText(tempPass);
                alert(`Password Reset Successfully!\n\nTemporary Password: ${tempPass}\n\n(Copied to clipboard)`);
            } catch {
                 alert(`Password Reset Successfully!\n\nTemporary Password: ${tempPass}\n\nPlease write this down.`);
            }

        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleRoleChange = async (userId: string, currentRole: UserRole) => {
        const newRole = currentRole === UserRole.ADMIN ? UserRole.USER : UserRole.ADMIN;
        if (!confirm(`Change role to ${newRole}?`)) return;
        try {
            await db.adminUpdateRole(userId, newRole);
            
            // Update List
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            
            // Update Modal
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
            }
        } catch (e: any) {
            alert(e.message);
        }
    };

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
                <i className="fas fa-search absolute left-3 top-3.5 text-gray-500"></i>
                <input 
                    type="text" 
                    placeholder="Search users by name, handle, email..." 
                    className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-xl border border-gray-700 focus:border-red-500 focus:outline-none"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center text-gray-500 py-10">Loading users...</div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Total Users: {users.length}</p>
                    {filteredUsers.map(user => (
                        <div key={user.id} className="bg-gray-800 rounded-xl p-3 border border-gray-700 flex items-center justify-between group hover:border-gray-500 transition-colors">
                            <div className="flex items-center space-x-3 overflow-hidden" onClick={() => setSelectedUser(user)}>
                                <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-600" />
                                <div className="min-w-0">
                                    <div className="flex items-center">
                                        <p className="font-bold text-sm text-white truncate mr-2">{user.name}</p>
                                        {user.role === UserRole.ADMIN && (
                                            <span className="bg-red-500 text-white text-[9px] px-1.5 rounded font-bold">ADMIN</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">{user.handle}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={() => setSelectedUser(user)}
                                    className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 flex items-center justify-center"
                                    title="View Details"
                                >
                                    <i className="fas fa-eye"></i>
                                </button>
                                {user.id !== currentUser?.id && (
                                    <>
                                        <button 
                                            onClick={() => handleResetPassword(user.id)}
                                            className="w-8 h-8 rounded-lg bg-blue-900/50 hover:bg-blue-800 text-blue-400 flex items-center justify-center border border-blue-900"
                                            title="Reset Password"
                                        >
                                            <i className="fas fa-key"></i>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(user.id)}
                                            className="w-8 h-8 rounded-lg bg-red-900/50 hover:bg-red-800 text-red-400 flex items-center justify-center border border-red-900"
                                            title="Delete User"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="h-24 bg-gray-800 relative">
                            {selectedUser.coverImage && <img src={selectedUser.coverImage} className="w-full h-full object-cover opacity-50" />}
                            <button onClick={() => setSelectedUser(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full text-white flex items-center justify-center">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="px-6 pb-6 relative">
                            <img src={selectedUser.avatar} className="w-20 h-20 rounded-full border-4 border-gray-900 absolute -top-10 shadow-lg bg-gray-800" />
                            <div className="mt-12">
                                <h3 className="text-xl font-bold">{selectedUser.name}</h3>
                                <p className="text-sm text-gray-400 mb-4">{selectedUser.handle} • {selectedUser.email}</p>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                                    <div className="bg-gray-800 p-2 rounded-lg">
                                        <span className="block font-bold text-lg">{selectedUser.followers}</span>
                                        <span className="text-[10px] text-gray-500 uppercase">Followers</span>
                                    </div>
                                    <div className="bg-gray-800 p-2 rounded-lg">
                                        <span className="block font-bold text-lg">{selectedUser.badges.length}</span>
                                        <span className="text-[10px] text-gray-500 uppercase">Badges</span>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-gray-800 pt-4">
                                     <div className="flex justify-between items-center text-sm">
                                         <span className="text-gray-500">Role</span>
                                         <span className={`font-bold ${selectedUser.role === UserRole.ADMIN ? 'text-red-500' : 'text-gray-300'}`}>{selectedUser.role}</span>
                                     </div>
                                     <div className="flex justify-between items-center text-sm">
                                         <span className="text-gray-500">Joined</span>
                                         <span className="text-gray-300">{new Date(selectedUser.joinedAt).toLocaleDateString()}</span>
                                     </div>
                                     <div className="flex justify-between items-center text-sm">
                                         <span className="text-gray-500">User ID</span>
                                         <span className="text-gray-500 text-xs font-mono">{selectedUser.id}</span>
                                     </div>
                                </div>

                                {currentUser?.id !== selectedUser.id && (
                                    <div className="mt-6 flex flex-col space-y-2">
                                        <button 
                                            onClick={() => handleRoleChange(selectedUser.id, selectedUser.role)}
                                            className="w-full py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-bold text-gray-300 transition-colors border border-gray-700"
                                        >
                                            {selectedUser.role === UserRole.ADMIN ? 'Demote to User' : 'Promote to Admin'}
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(selectedUser.id)}
                                            className="w-full py-2 bg-red-900/50 hover:bg-red-900/80 rounded-lg text-xs font-bold text-red-300 transition-colors border border-red-900"
                                        >
                                            Delete Account Permanently
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 2. REPORTS TAB
const ReportsTab: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await db.getReports();
            setReports(data);
            setLoading(false);
        };
        load();
    }, []);

    const handleResolve = async (id: string) => {
        await db.resolveReport(id);
        setReports(prev => prev.map(r => r.id === id ? {...r, status: 'resolved'} : r));
    };

    return (
        <div className="p-4 space-y-3">
             {loading ? (
                <div className="text-center text-gray-500 py-10">Loading reports...</div>
            ) : reports.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                    <i className="fas fa-check-circle text-4xl mb-3 text-green-500/50"></i>
                    <p>No reports found.</p>
                </div>
            ) : (
                reports.map(report => (
                    <div key={report.id} className={`bg-gray-800 p-4 rounded-xl border ${report.status === 'pending' ? 'border-red-500/30' : 'border-green-500/30'} relative`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-gray-900 text-gray-300 text-[10px] uppercase font-bold px-2 py-1 rounded border border-gray-700">
                                {report.targetType}
                            </span>
                            <span className="text-xs text-gray-500">{new Date(report.timestamp).toLocaleDateString()}</span>
                        </div>
                        <h4 className="font-bold text-sm text-gray-200">{report.reason}</h4>
                        <p className="text-xs text-gray-400 mt-1 italic mb-3">"{report.details}"</p>
                        
                        <div className="flex justify-between items-center border-t border-gray-700 pt-3">
                             <span className="text-xs text-gray-500 font-mono">ID: {report.targetId}</span>
                             {report.status === 'pending' ? (
                                 <button onClick={() => handleResolve(report.id)} className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-500">
                                     Mark Resolved
                                 </button>
                             ) : (
                                 <span className="text-xs text-green-500 font-bold"><i className="fas fa-check mr-1"></i> Resolved</span>
                             )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

// 3. BADGES TAB
const BadgesTab: React.FC = () => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [iconClass, setIconClass] = useState('fa-trophy'); 
    const [customImage, setCustomImage] = useState('');
    const [message, setMessage] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const handleCreateBadge = async () => {
        try {
            // Priority: Custom Image > Selected Icon
            const finalIcon = customImage || iconClass;
            await db.createAdminBadge(name, desc, finalIcon);
            setMessage(`Badge "${name}" created successfully!`);
            setName('');
            setDesc('');
            setCustomImage('');
        } catch (e: any) {
            setMessage(`Error: ${e.message}`);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await processPatchImage(file);
            setCustomImage(base64);
        } catch(e: any) {
            alert(e.message);
        }
    };
    
    // Expanded Icon Selection
    const icons = [
        'fa-trophy', 'fa-star', 'fa-medal', 'fa-crown', 'fa-film', 'fa-video', 
        'fa-check-double', 'fa-fire', 'fa-bolt', 'fa-heart', 'fa-gem', 
        'fa-award', 'fa-shield-alt', 'fa-rocket', 'fa-ghost', 'fa-dragon'
    ];

    return (
        <div className="p-4 space-y-4">
             <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
                <h3 className="text-lg font-bold text-white mb-2">Create Global Badge</h3>
                <p className="text-xs text-gray-400">These badges are system-wide achievements.</p>
                
                <input 
                    type="text" 
                    placeholder="Badge Name"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />
                
                <input 
                    type="text" 
                    placeholder="Description"
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-red-500 outline-none"
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                />

                <div className="space-y-3">
                    <label className="text-xs text-gray-500 font-bold uppercase block">Badge Visual</label>
                    
                    {/* Custom Image Upload */}
                    <div className="flex items-center space-x-3 bg-gray-900 p-3 rounded-lg border border-gray-700">
                        <div 
                            onClick={() => fileRef.current?.click()}
                            className="w-12 h-12 rounded-lg bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-red-500 overflow-hidden relative"
                        >
                            {customImage ? (
                                <img src={customImage} className="w-full h-full object-contain" />
                            ) : (
                                <i className="fas fa-upload text-gray-500"></i>
                            )}
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Upload PNG (Transparent)</p>
                            <button onClick={() => setCustomImage('')} className="text-[10px] text-red-500 underline">Clear Image</button>
                        </div>
                        <input type="file" ref={fileRef} className="hidden" accept="image/png" onChange={handleImageUpload} />
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="h-px bg-gray-700 flex-1"></span>
                        <span>OR SELECT ICON</span>
                        <span className="h-px bg-gray-700 flex-1"></span>
                    </div>

                    {/* Icon Grid */}
                    <div className={`grid grid-cols-6 gap-2 ${customImage ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        {icons.map(icon => (
                            <button 
                                key={icon}
                                onClick={() => setIconClass(icon)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${iconClass === icon ? 'bg-red-500 text-white border-red-500 scale-110' : 'bg-gray-900 border-gray-600 text-gray-400'}`}
                            >
                                <i className={`fas ${icon}`}></i>
                            </button>
                        ))}
                    </div>
                </div>

                {message && <div className="p-3 bg-gray-900 rounded border border-gray-600 text-sm text-green-400">{message}</div>}

                <button 
                    onClick={handleCreateBadge}
                    disabled={!name || !desc}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                    Create Badge
                </button>
            </div>
        </div>
    );
}

// Utility Components
const TabButton: React.FC<{ icon: string, active: boolean, onClick: () => void }> = ({ icon, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-10 h-8 rounded-md flex items-center justify-center transition-all ${active ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
    >
        <i className={`fas ${icon}`}></i>
    </button>
);