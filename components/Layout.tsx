
import React, { useEffect, useState } from 'react';
import { db } from '../services/db';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  hideNav?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onNavigate, hideNav = false }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkNotifications = async () => {
        const count = await db.getUnreadNotificationCount();
        setUnreadCount(count);
    };
    // Initial check
    checkNotifications();
    // Poll every 5s for demo purposes
    const interval = setInterval(checkNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    // changed h-screen to h-[100dvh] to handle mobile browser bars correctly
    <div className="flex flex-col h-[100dvh] bg-gray-900 text-gray-100 max-w-md mx-auto shadow-2xl overflow-hidden relative border-x border-gray-800">
      {/* Top Bar - Only show if Nav is shown (optional design choice, keeping it simpler here) */}
      {!hideNav && (
        <header className="bg-gray-800/90 backdrop-blur-md p-4 sticky top-0 z-20 border-b border-gray-700 flex justify-between items-center pt-safe-top">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 cursor-pointer" onClick={() => onNavigate('home')}>
            WatchQuest
            </h1>
            <div className="flex items-center space-x-1">
                {/* Search Button */}
                <button 
                    onClick={() => onNavigate('discover')} 
                    className="text-gray-400 hover:text-white p-2 transition-colors"
                >
                    <i className="fas fa-search text-lg"></i>
                </button>

                {/* Notification Bell */}
                <button 
                    onClick={() => onNavigate('notifications')} 
                    className="relative text-gray-400 hover:text-white p-2 transition-colors"
                >
                    <i className="fas fa-bell text-lg"></i>
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-800 animate-pulse"></span>
                    )}
                </button>
                
                {/* Profile Avatar Trigger - Now goes to Settings as requested */}
                <div className="ml-2 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold shadow-lg cursor-pointer" onClick={() => onNavigate('settings')}>
                    <i className="fas fa-cog text-[10px] text-white/50 absolute -top-1 -right-1 bg-gray-900 rounded-full p-0.5"></i>
                    MS
                </div>
            </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto scroll-smooth ${!hideNav ? 'pb-20' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNav && (
        <nav className="absolute bottom-0 w-full bg-gray-800 border-t border-gray-700 flex justify-between items-center h-16 z-30 pb-safe-bottom px-2">
            <NavButton 
                icon="fa-home" 
                label="Home" 
                isActive={activeTab === 'home'} 
                onClick={() => onNavigate('home')} 
            />
            <NavButton 
                icon="fa-bolt" 
                label="Activity" 
                isActive={activeTab === 'activity'} 
                onClick={() => onNavigate('activity')} 
            />
            {/* Discover removed - moved to header search icon */}
            <div className="relative -top-5 mx-1">
                <button 
                    onClick={() => onNavigate('create')}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-lg transform active:scale-95 transition-transform"
                >
                    <i className="fas fa-plus text-white text-lg"></i>
                </button>
            </div>
            <NavButton 
                icon="fa-list-ul" 
                label="My Lists" 
                isActive={activeTab === 'mylists'} 
                onClick={() => onNavigate('mylists')} 
            />
            <NavButton 
                icon="fa-user" 
                label="Profile" 
                isActive={activeTab === 'profile'} 
                onClick={() => onNavigate('profile')} 
            />
        </nav>
      )}
    </div>
  );
};

interface NavButtonProps {
    icon: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, onClick }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
        <i className={`fas ${icon} text-lg mb-1`}></i>
        <span className="text-[9px] font-medium">{label}</span>
    </button>
);
