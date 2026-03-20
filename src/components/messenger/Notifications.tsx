import Icon from '@/components/ui/icon';
import { Notification } from './data';

interface NotificationsProps {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onOpen: (chatId: number) => void;
}

export default function Notifications({ notifications, onMarkRead, onMarkAllRead, onOpen }: NotificationsProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="font-semibold text-base text-foreground">Уведомления</h2>
          {unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{unreadCount} непрочитанных</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Прочитать все
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Icon name="BellOff" size={40} />
            <p className="text-sm">Уведомлений пока нет</p>
          </div>
        )}
        {notifications.map((notif, i) => (
          <div
            key={notif.id}
            className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer animate-fade-in
              ${notif.read ? 'bg-card hover:bg-secondary/40' : 'bg-primary/10 border border-primary/20 hover:bg-primary/15'}`}
            style={{ animationDelay: `${i * 40}ms` }}
            onClick={() => { onMarkRead(notif.id); onOpen(notif.chatId); }}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
              ${notif.read ? 'bg-secondary text-muted-foreground' : 'bg-primary/20 text-primary'}`}>
              <Icon name="Bell" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-snug ${notif.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                {notif.text}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
            </div>
            {!notif.read && (
              <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
