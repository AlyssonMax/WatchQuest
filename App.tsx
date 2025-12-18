import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { HomeScreen } from './screens/HomeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CreateListScreen } from './screens/CreateListScreen';
import { MyListsScreen } from './screens/MyListsScreen';
import { ListViewScreen } from './screens/ListViewScreen';
import { AuthScreen } from './screens/AuthScreen';
import { AdminScreen } from './screens/AdminScreen';
import { AchievementsScreen } from './screens/AchievementsScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { NotificationsScreen } from './screens/NotificationsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ActivityScreen } from './screens/ActivityScreen';
import { db } from './services/db';

interface ListNavParams {
    id: string;
    readOnly: boolean;
}

// Simple Router
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedListParams, setSelectedListParams] = useState<ListNavParams | null>(null);
  const [viewUserId, setViewUserId] = useState<string | null>(null); // For visiting profiles
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const user = await db.getCurrentUser();
    setIsAuthenticated(!!user);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleLoginSuccess = () => {
      setIsAuthenticated(true);
      setActiveTab('home');
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setActiveTab('home');
      setSelectedListParams(null);
  };

  // Navigation Helper
  const navigateTo = (tab: string, params?: { listId?: string, userId?: string, readOnly?: boolean }) => {
      if (params?.listId) {
          setSelectedListParams({ 
              id: params.listId, 
              readOnly: params.readOnly ?? true // Default to readOnly if not specified
          });
      }
      if (params?.userId) {
          setViewUserId(params.userId);
      } else if (tab === 'profile' && !params?.userId) {
          // Reset if navigating to own profile
          setViewUserId(null);
      }
      
      setActiveTab(tab);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigate={(tab, params) => navigateTo(tab, { ...params, readOnly: true })} />;
      case 'activity':
        return <ActivityScreen onNavigate={navigateTo} />;
      case 'discover':
        return <DiscoverScreen onNavigate={(tab, params) => navigateTo(tab, { ...params, readOnly: true })} />;
      case 'create':
        return <CreateListScreen onSave={() => navigateTo('mylists')} onCancel={() => navigateTo('home')} />;
      case 'mylists':
        // My Lists (Created or Saved) should be editable
        return <MyListsScreen onNavigate={(tab, params) => navigateTo(tab, { ...params, readOnly: false })} />;
      case 'list_detail':
        return selectedListParams 
            ? <ListViewScreen 
                listId={selectedListParams.id}
                readOnly={selectedListParams.readOnly}
                onBack={() => {
                    // Logic to figure out where to go back to, or just default to previous tab if simple
                    // For now, simpler to just go to previous tab logically or home/mylists depending on context
                    // But our router is simple. Let's assume standard back or home.
                    setActiveTab('home'); // Simplification for this router
                }} 
                onNavigate={navigateTo} 
              /> 
            : <MyListsScreen onNavigate={navigateTo} />;
      case 'profile':
        return <ProfileScreen 
                    viewUserId={viewUserId} 
                    onLogout={handleLogout} 
                    onAdminClick={() => navigateTo('admin')} 
                    onNavigate={navigateTo} 
                />;
      case 'achievements':
        return <AchievementsScreen onBack={() => navigateTo('profile')} />;
      case 'admin':
        return <AdminScreen onBack={() => navigateTo('profile')} />;
      case 'notifications':
        return <NotificationsScreen onNavigate={navigateTo} />;
      case 'settings':
        return <SettingsScreen onBack={() => navigateTo('profile')} />;
      default:
        return <HomeScreen onNavigate={navigateTo} />;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-gray-900 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 tracking-wider">WatchQuest</h1>
      </div>
    );
  }

  if (!isAuthenticated) {
      return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout activeTab={activeTab} onNavigate={(tab) => navigateTo(tab)} hideNav={false}>
      {renderScreen()}
    </Layout>
  );
}
