
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { User, Report, Badge, BadgeType } from '../types';
import { processPatchImage } from '../services/imageUtils';

interface AdminScreenProps {
    onBack: () => void;
    onNavigateToPost?: (id: string) => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ onBack, onNavigateToPost }) => {
    const [tab, setTab] = useState<'stats' | 'users' | 'reports' | 'badges' | 'audit'>('stats');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [globalBadges, setGlobalBadges] = useState<Badge[]>([]);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const u = await db.getAllUsers();
        const r = await db.getReports();
        const s = await db.getDashboardStats();
        const b = await db.getGlobalBadges();
        setUsers(u);
        setReports(r);
        setStats(s);
        setGlobalBadges(b);
    };

    const handleSelectUserById = async (id: string) => {
        const user = await db.getUserById(id);
        if (user) {
            setSelectedUser(user);
            setTab('users');
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-950 font-sans">
            {/* Admin Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center space-x-3">
                    <button onClick={selectedUser ? () => setSelectedUser(null) : onBack} className="text-gray-400 hover:text-white transition-colors">
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <h1 className="text-sm font-black text-red-500 uppercase tracking-tighter">Command Unit</h1>
                        {selectedUser && <p className="text-[9px] text-gray-500 font-mono">MODERATING: {selectedUser.handle}</p>}
                    </div>
                </div>
                <div className="flex bg-black rounded-lg p-1 border border-gray-800">
                    <TabIcon active={tab === 'stats'} icon="fa-chart-pie" onClick={() => { setTab('stats'); setSelectedUser(null); }} />
                    <TabIcon active={tab === 'users'} icon="fa-users-cog" onClick={() => { setTab('users'); setSelectedUser(null); }} />
                    <TabIcon active={tab === 'badges'} icon="fa-award" onClick={() => { setTab('badges'); setSelectedUser(null); }} />
                    <TabIcon active={tab === 'reports'} icon="fa-flag" onClick={() => { setTab('reports'); setSelectedUser(null); }} />
                    <TabIcon active={tab === 'audit'} icon="fa-history" onClick={() => { setTab('audit'); setSelectedUser(null); }} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-20">
                {selectedUser ? (
                    <UserDetailView 
                        user={selectedUser} 
                        onBack={() => { setSelectedUser(null); loadData(); }} 
                        badges={globalBadges}
                    />
                ) : (
                    <>
                        {tab === 'stats' && stats && (
                            <div className="p-4 grid grid-cols-2 gap-4 animate-fade-in">
                                <StatCard label="Total Operatives" value={stats.totalUsers} color="text-blue-500" icon="fa-users" />
                                <StatCard label="Quarantined" value={stats.bannedUsers} color="text-red-500" icon="fa-user-slash" />
                                <StatCard label="Active Warnings" value={stats.activeWarnings} color="text-yellow-500" icon="fa-gavel" />
                                <StatCard label="Open Reports" value={stats.pendingReports} color="text-purple-500" icon="fa-flag" />
                            </div>
                        )}

                        {tab === 'users' && (
                            <div className="p-2 space-y-2">
                                <div className="px-2 pb-2">
                                    <input 
                                        type="text" 
                                        placeholder="Search by handle or email..." 
                                        className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs outline-none focus:border-red-500/50"
                                    />
                                </div>
                                {users.map(user => (
                                    <UserAdminCard key={user.id} user={user} onSelect={() => setSelectedUser(user)} />
                                ))}
                            </div>
                        )}

                        {tab === 'badges' && (
                            <BadgeManagementView badges={globalBadges} onRefresh={loadData} />
                        )}

                        {tab === 'reports' && (
                            <div className="p-2 space-y-3">
                                {reports.length === 0 ? (
                                    <div className="text-center py-20 text-gray-700 italic text-xs">No active alerts. All clear.</div>
                                ) : (
                                    reports.sort((a,b) => b.timestamp - a.timestamp).map(report => (
                                        <ReportCard 
                                            key={report.id} 
                                            report={report} 
                                            onRefresh={loadData} 
                                            onNavigateToPost={onNavigateToPost}
                                            onSelectUser={handleSelectUserById}
                                        />
                                    ))
                                )}
                            </div>
                        )}

                        {tab === 'audit' && <AuditList onSelectUser={handleSelectUserById} />}
                    </>
                )}
            </div>
        </div>
    );
};

const BadgeManagementView: React.FC<{ badges: Badge[], onRefresh: () => void }> = ({ badges, onRefresh }) => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [icon, setIcon] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const base64 = await processPatchImage(file);
            setIcon(base64);
        }
    };

    const handleCreate = async () => {
        if (!name || !desc || !icon) return;
        await db.createGlobalBadge(name, desc, icon);
        setName(''); setDesc(''); setIcon('');
        onRefresh();
    };

    return (
        <div className="p-4 space-y-6">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase text-red-500">Create Official Achievement</h3>
                <input type="text" placeholder="Achievement Name" className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs outline-none focus:border-red-500" value={name} onChange={e => setName(e.target.value)} />
                <textarea placeholder="Description of how to earn" className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs outline-none focus:border-red-500 h-20" value={desc} onChange={e => setDesc(e.target.value)} />
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-black rounded-lg border border-gray-800 flex items-center justify-center overflow-hidden">
                        {icon ? <img src={icon} className="w-full h-full object-contain" /> : <i className="fas fa-medal text-gray-700"></i>}
                    </div>
                    <button onClick={() => fileRef.current?.click()} className="flex-1 bg-gray-800 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest">Select Icon (PNG)</button>
                    <input type="file" ref={fileRef} className="hidden" accept="image/png" onChange={handleUpload} />
                </div>
                <button onClick={handleCreate} className="w-full bg-red-600 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-900/20">Forge Badge</button>
            </div>

            <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-gray-500">Global Armory</h3>
                {badges.map(b => (
                    <div key={b.id} className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex items-center space-x-3">
                        <div className="w-10 h-10 flex-shrink-0">
                            {b.icon.startsWith('fa-') ? <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center"><i className={`fas ${b.icon} text-yellow-500`}></i></div> : <img src={b.icon} className="w-full h-full object-contain" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{b.name}</p>
                            <p className="text-[10px] text-gray-500 truncate">{b.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const UserDetailView: React.FC<{ user: User, onBack: () => void, badges: Badge[] }> = ({ user, onBack, badges }) => {
    const handleStrike = async () => {
        const reason = prompt(`Specify the violation for ${user.handle}:`);
        if (reason) {
            await db.issueStrike(user.id, reason);
            alert("Strike logged. System recalculated.");
            onBack();
        }
    };

    const handleBan = async () => {
        const reason = prompt(`Enter definitive reason for PERMANENT BAN of ${user.email}:`);
        if (reason && confirm("THIS ACTION IS IRREVERSIBLE. Blacklist this operative?")) {
            await db.banUser(user.id, reason);
            onBack();
        }
    };

    const handleGrantBadge = async (badgeId: string) => {
        if (confirm("Award this achievement manually to the subject?")) {
            await db.grantBadgeToUser(user.id, badgeId);
            alert("Honor bestowed.");
        }
    };

    return (
        <div className="p-4 space-y-6 animate-fade-in-up">
            {/* Profile Header */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center">
                <img src={user.avatar} className="w-24 h-24 rounded-full mx-auto border-4 border-gray-800 mb-4 shadow-xl" />
                <h2 className="text-xl font-black">{user.name}</h2>
                <p className="text-red-500 font-mono text-xs">{user.handle}</p>
                
                <div className="mt-6 flex justify-center space-x-3">
                    <button onClick={handleStrike} className="flex-1 bg-yellow-600/10 text-yellow-500 border border-yellow-600/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <i className="fas fa-gavel mr-2"></i> Issue Strike
                    </button>
                    <button onClick={handleBan} className="flex-1 bg-red-600/10 text-red-500 border border-red-600/30 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <i className="fas fa-user-slash mr-2"></i> Permanent Ban
                    </button>
                </div>
            </div>

            {/* Manual Achievements Grant */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Manual Distinction</h3>
                <div className="space-y-2">
                    {badges.map(b => (
                        <div key={b.id} className="flex items-center justify-between bg-black/30 p-2 rounded-lg">
                            <span className="text-xs font-bold">{b.name}</span>
                            <button 
                                onClick={() => handleGrantBadge(b.id)}
                                disabled={user.badges.some(ub => ub.id === b.id)}
                                className={`text-[9px] px-3 py-1 rounded-md uppercase font-black ${user.badges.some(ub => ub.id === b.id) ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white'}`}
                            >
                                {user.badges.some(ub => ub.id === b.id) ? 'Already Won' : 'Grant Badge'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Warnings Status */}
            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Strike Tracker</h3>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${user.isPermanentlyBanned ? 'bg-red-900 text-red-400' : 'bg-green-900 text-green-400'}`}>
                        {user.isPermanentlyBanned ? 'TERMINATED' : 'ACTIVE'}
                    </span>
                </div>
                
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-gray-400">Warning Level</span>
                        <span className="text-white font-bold">{user.strikes.length} / 3</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-700 ${user.strikes.length >= 2 ? 'bg-red-600' : 'bg-yellow-500'}`} 
                            style={{ width: `${(user.strikes.length / 3) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const UserAdminCard: React.FC<{ user: User, onSelect: () => void }> = ({ user, onSelect }) => (
    <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex items-center justify-between hover:border-gray-600 cursor-pointer transition-all active:scale-[0.98]" onClick={onSelect}>
        <div className="flex items-center space-x-3">
            <img src={user.avatar} className="w-10 h-10 rounded-full grayscale border border-gray-800" />
            <div>
                <p className="text-xs font-bold">{user.name}</p>
                <p className="text-[10px] text-gray-500 font-mono">{user.handle}</p>
                <div className="flex space-x-1 mt-1">
                    <span className={`text-[8px] font-black px-1.5 rounded uppercase ${user.isPermanentlyBanned ? 'bg-red-900 text-red-500' : 'bg-gray-800 text-gray-400'}`}>
                        {user.isPermanentlyBanned ? 'Banned' : 'Clear'}
                    </span>
                </div>
            </div>
        </div>
        <i className="fas fa-chevron-right text-gray-800 text-xs"></i>
    </div>
);

const ReportCard: React.FC<{ 
    report: Report, 
    onRefresh: () => void, 
    onNavigateToPost?: (id: string) => void,
    onSelectUser: (id: string) => void
}> = ({ report, onRefresh, onNavigateToPost, onSelectUser }) => {
    const [reply, setReply] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const handleSendResponse = async () => {
        if (!reply.trim()) return;
        await db.respondToReport(report.id, reply);
        setIsReplying(false);
        onRefresh();
    };

    return (
        <div className="bg-gray-900 border border-gray-800 p-3 rounded-xl">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded">{report.reason}</span>
                <span className="text-[9px] text-gray-600 font-mono">{new Date(report.timestamp).toLocaleDateString()}</span>
            </div>
            
            <p className="text-[11px] text-gray-300 italic mb-3">"{report.details}"</p>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div onClick={() => onSelectUser(report.reporterId)} className="bg-black/30 p-2 rounded-lg border border-gray-800 cursor-pointer hover:bg-gray-800 transition-colors">
                    <p className="text-[8px] text-gray-600 uppercase font-bold mb-1">Reporter</p>
                    <p className="text-[10px] text-blue-400 font-bold truncate">@{report.reporterName}</p>
                </div>
                <div className="bg-black/30 p-2 rounded-lg border border-gray-800">
                    <p className="text-[8px] text-gray-600 uppercase font-bold mb-1">Target</p>
                    {report.targetType === 'user' ? (
                        <p onClick={() => onSelectUser(report.targetId)} className="text-[10px] text-red-400 font-bold truncate cursor-pointer hover:underline">View User</p>
                    ) : (
                        <p onClick={() => onNavigateToPost?.(report.targetId)} className="text-[10px] text-purple-400 font-bold truncate cursor-pointer hover:underline">
                            <i className="fas fa-link mr-1"></i> View Post
                        </p>
                    )}
                </div>
            </div>

            {report.status === 'pending' ? (
                isReplying ? (
                    <div className="space-y-2">
                        <textarea 
                            className="w-full bg-black border border-gray-700 rounded-lg p-2 text-xs text-white focus:border-blue-500 outline-none h-20"
                            placeholder="Write a private message to the reporter..."
                            value={reply}
                            onChange={e => setReply(e.target.value)}
                        />
                        <div className="flex space-x-2">
                            <button onClick={() => setIsReplying(false)} className="flex-1 py-2 text-[10px] bg-gray-800 rounded-lg font-bold">CANCEL</button>
                            <button onClick={handleSendResponse} className="flex-1 py-2 text-[10px] bg-blue-600 text-white font-black rounded-lg">RESOLVE & REPLY</button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setIsReplying(true)} className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors border border-gray-700">
                        Process Incident
                    </button>
                )
            ) : (
                <div className="bg-green-900/10 border border-green-900/20 p-2 rounded-lg">
                    <p className="text-[9px] font-black text-green-500 uppercase mb-1">Resolved</p>
                    <p className="text-[10px] text-gray-500 font-mono italic">R: {report.adminResponse}</p>
                </div>
            )}
        </div>
    );
};

const AuditList: React.FC<{ onSelectUser: (id: string) => void }> = ({ onSelectUser }) => {
    const [logs, setLogs] = useState<any[]>([]);
    useEffect(() => {
        db.getAllUsers().then(() => {
            setLogs([
                { id: '1', actionType: 'ISSUE_WARNING', adminName: 'Admin', targetUserId: 'u1', timestamp: Date.now() - 100000 },
                { id: '2', actionType: 'BAN_USER', adminName: 'Admin', targetUserId: 'u2', timestamp: Date.now() - 500000 },
            ]);
        });
    }, []);

    return (
        <div className="p-2 space-y-2">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 mb-2">Operational History</h3>
            {logs.map(log => (
                <div key={log.id} className="bg-gray-900 border border-gray-800 p-3 rounded-xl flex items-center justify-between font-mono">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-blue-400">[{log.actionType}]</p>
                        <p className="text-[9px] text-gray-500 mt-1">Admin: {log.adminName}</p>
                        <p onClick={() => onSelectUser(log.targetUserId)} className="text-[9px] text-red-500 mt-1 cursor-pointer hover:underline truncate">Target: {log.targetUserId}</p>
                    </div>
                    <div className="text-[8px] text-gray-600 text-right">
                        {new Date(log.timestamp).toLocaleDateString()}<br/>
                        {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            ))}
        </div>
    );
};

const TabIcon: React.FC<{ active: boolean, icon: string, onClick: () => void }> = ({ active, icon, onClick }) => (
    <button onClick={onClick} className={`w-9 h-9 rounded-md flex items-center justify-center transition-all ${active ? 'bg-red-600 text-white shadow-lg' : 'text-gray-600 hover:text-gray-400'}`}>
        <i className={`fas ${icon} text-sm`}></i>
    </button>
);

const StatCard: React.FC<{ label: string, value: number, color: string, icon: string }> = ({ label, value, color, icon }) => (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-inner relative overflow-hidden">
        <i className={`fas ${icon} absolute -right-2 -bottom-2 text-4xl opacity-5 ${color}`}></i>
        <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">{label}</p>
    </div>
);
