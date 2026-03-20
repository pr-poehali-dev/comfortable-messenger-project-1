import { useState } from 'react';
import Sidebar from '@/components/messenger/Sidebar';
import ChatList from '@/components/messenger/ChatList';
import ChatWindow from '@/components/messenger/ChatWindow';
import Notifications from '@/components/messenger/Notifications';
import Profile from '@/components/messenger/Profile';
import Settings from '@/components/messenger/Settings';
import CreateGroup from '@/components/messenger/CreateGroup';
import EmptyState from '@/components/messenger/EmptyState';
import { CHATS, NOTIFICATIONS, Chat, Notification } from '@/components/messenger/data';

type Tab = 'chats' | 'notifications' | 'profile' | 'settings';

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const [chats, setChats] = useState<Chat[]>(CHATS);
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? null;

  const totalUnread = chats.reduce((acc, c) => acc + c.unread, 0);
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const handleSelectChat = (id: number) => {
    setSelectedChatId(id);
    setMobileShowChat(true);
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c))
    );
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

  const handleCreateGroup = (name: string, _memberIds: number[]) => {
    const newGroup: Chat = {
      id: Date.now(),
      name,
      avatar: name.slice(0, 2).toUpperCase(),
      lastMessage: 'Группа создана',
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      unread: 0,
      status: 'online',
      isGroup: true,
      messages: [
        {
          id: 1,
          text: `Группа "${name}" создана. Добро пожаловать!`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          isOut: false,
        },
      ],
    };
    setChats((prev) => [newGroup, ...prev]);
    setSelectedChatId(newGroup.id);
    setMobileShowChat(true);
  };

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
                chats={chats}
                selectedId={selectedChatId}
                onSelect={handleSelectChat}
                onCreateGroup={() => setShowCreateGroup(true)}
              />
            </div>

            <div className={`${!mobileShowChat ? 'hidden md:flex' : 'flex'} flex-1 min-w-0`}>
              {selectedChat ? (
                <ChatWindow
                  chat={selectedChat}
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

        {activeTab === 'profile' && <Profile />}
        {activeTab === 'settings' && <Settings />}
      </div>

      {showCreateGroup && (
        <CreateGroup
          contacts={chats}
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
}
