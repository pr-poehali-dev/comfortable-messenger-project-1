import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/messenger/Sidebar';
import ChatList from '@/components/messenger/ChatList';
import ChatWindow from '@/components/messenger/ChatWindow';
import Notifications from '@/components/messenger/Notifications';
import Profile from '@/components/messenger/Profile';
import Settings from '@/components/messenger/Settings';
import CreateGroup from '@/components/messenger/CreateGroup';
import EmptyState from '@/components/messenger/EmptyState';
import AuthScreen from '@/components/messenger/AuthScreen';
import { User, ApiChat, getSession, getUser, saveSession, messagesApi, formatTime } from '@/lib/api';
import { NOTIFICATIONS, Notification } from '@/components/messenger/data';

type Tab = 'chats' | 'notifications' | 'profile' | 'settings';

export default function Index() {
  const [user, setUser] = useState<User | null>(getUser());
  const [authed, setAuthed] = useState<boolean>(!!getSession() && !!getUser());

  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [chats, setChats] = useState<ApiChat[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [chatsLoading, setChatsLoading] = useState(false);

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;
  const totalUnread = chats.reduce((acc, c) => acc + (c.unread || 0), 0);
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const loadChats = useCallback(async () => {
    try {
      const list = await messagesApi.getChats();
      setChats(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    setChatsLoading(true);
    loadChats().finally(() => setChatsLoading(false));
    const interval = setInterval(loadChats, 5000);
    return () => clearInterval(interval);
  }, [authed, loadChats]);

  const handleAuth = (u: User, sessionId: string) => {
    saveSession(sessionId, u);
    setUser(u);
    setAuthed(true);
  };

  const handleLogout = () => {
    setUser(null);
    setAuthed(false);
    setChats([]);
    setSelectedChatId(null);
  };

  const handleSelectChat = (id: number) => {
    setSelectedChatId(id);
    setMobileShowChat(true);
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  };

  const handleBlock = (id: number) => {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, blocked: true } : c)));
  };

  const handleUnblock = (id: number) => {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, blocked: false } : c)));
  };

  const handleMarkRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleOpenFromNotif = (chatId: number) => {
    setActiveTab('chats');
    handleSelectChat(chatId);
  };

  const handleCreateGroup = async (name: string, memberIds: number[]) => {
    try {
      const res = await messagesApi.createChat(memberIds, true, name);
      await loadChats();
      handleSelectChat(res.chat_id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenChatByUserId = async (userId: number) => {
    try {
      const res = await messagesApi.createChat([userId]);
      await loadChats();
      setActiveTab('chats');
      handleSelectChat(res.chat_id);
    } catch (e) {
      console.error(e);
    }
  };

  if (!authed) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  // Convert ApiChat to old Chat format for ChatList/CreateGroup compatibility
  const chatListItems = chats.map((c) => ({
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    lastMessage: c.last_message,
    time: formatTime(c.last_at),
    unread: c.unread,
    status: 'online' as const,
    isGroup: c.is_group,
    messages: [],
    blocked: c.blocked,
    avatar_url: c.avatar_url,
  }));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); if (tab !== 'chats') setMobileShowChat(false); }}
        unreadCount={totalUnread}
        notifCount={unreadNotifs}
      />

      <div className="flex flex-1 min-w-0">
        {activeTab === 'chats' && (
          <>
            <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
              <ChatList
                chats={chatListItems}
                selectedId={selectedChatId}
                onSelect={handleSelectChat}
                onCreateGroup={() => setShowCreateGroup(true)}
              />
            </div>

            <div className={`${!mobileShowChat ? 'hidden md:flex' : 'flex'} flex-1 min-w-0`}>
              {selectedChat && user ? (
                <ChatWindow
                  chat={selectedChat}
                  currentUserId={user.id}
                  onBack={() => setMobileShowChat(false)}
                  onBlock={handleBlock}
                  onUnblock={handleUnblock}
                />
              ) : (
                <EmptyState />
              )}
            </div>
          </>
        )}

        {activeTab === 'notifications' && (
          <Notifications
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onOpen={handleOpenFromNotif}
          />
        )}

        {activeTab === 'profile' && user && (
          <Profile
            user={user}
            onUserUpdate={(u) => setUser(u)}
            onLogout={handleLogout}
            onOpenChat={handleOpenChatByUserId}
          />
        )}

        {activeTab === 'settings' && <Settings />}
      </div>

      {showCreateGroup && (
        <CreateGroup
          contacts={chatListItems}
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
}
