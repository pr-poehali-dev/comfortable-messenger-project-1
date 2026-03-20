import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Chat } from './data';

interface ChatListProps {
  chats: Chat[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onCreateGroup: () => void;
}

export default function ChatList({ chats, selectedId, onSelect, onCreateGroup }: ChatListProps) {
  const [search, setSearch] = useState('');

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-72 flex flex-col border-r border-border shrink-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base text-foreground">Сообщения</h2>
          <button
            onClick={onCreateGroup}
            title="Создать группу"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Icon name="UserPlus" size={16} />
          </button>
        </div>
        <div className="relative">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по чатам..."
            className="w-full bg-secondary rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Чаты не найдены
          </div>
        )}
        {filtered.map((chat, i) => (
          <button
            key={chat.id}
            onClick={() => onSelect(chat.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-all text-left animate-fade-in
              ${selectedId === chat.id ? 'bg-secondary' : ''}
            `}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="relative shrink-0">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-semibold
                ${chat.isGroup ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground'}
                ${chat.blocked ? 'opacity-50' : ''}
              `}>
                {chat.avatar}
              </div>
              {!chat.isGroup && !chat.blocked && (
                <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card
                  ${chat.status === 'online' ? 'status-online' : chat.status === 'away' ? 'status-away' : 'bg-muted-foreground'}
                `} />
              )}
              {chat.blocked && (
                <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card bg-destructive flex items-center justify-center">
                  <Icon name="Ban" size={8} className="text-white" />
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-medium text-sm text-foreground truncate">{chat.name}</span>
                <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{chat.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate">{chat.lastMessage}</span>
                {chat.unread > 0 && (
                  <span className="ml-2 shrink-0 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
