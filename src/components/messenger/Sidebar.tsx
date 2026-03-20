import Icon from '@/components/ui/icon';

type Tab = 'chats' | 'notifications' | 'profile' | 'settings';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  unreadCount: number;
  notifCount: number;
}

const tabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'chats', icon: 'MessageCircle', label: 'Чаты' },
  { id: 'notifications', icon: 'Bell', label: 'Уведомления' },
  { id: 'profile', icon: 'User', label: 'Профиль' },
  { id: 'settings', icon: 'Settings', label: 'Настройки' },
];

export default function Sidebar({ activeTab, onTabChange, unreadCount, notifCount }: SidebarProps) {
  const badges: Partial<Record<Tab, number>> = {
    chats: unreadCount,
    notifications: notifCount,
  };

  return (
    <aside className="w-16 flex flex-col items-center py-5 gap-1 border-r border-border bg-card shrink-0">
      <div className="mb-6 w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
        <span className="text-primary-foreground font-bold text-sm">В</span>
      </div>

      <div className="flex flex-col gap-1 flex-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const badge = badges[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              title={tab.label}
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
                ${isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
            >
              <Icon name={tab.icon} size={19} />
              {badge ? (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-destructive text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
