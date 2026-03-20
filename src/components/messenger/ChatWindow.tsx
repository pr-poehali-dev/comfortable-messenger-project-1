import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Chat, Message, MessageStatus } from './data';

interface ChatWindowProps {
  chat: Chat;
  onBack: () => void;
  onBlock: (id: number) => void;
  onUnblock: (id: number) => void;
}

function StatusIcon({ status }: { status?: MessageStatus }) {
  if (!status) return null;
  if (status === 'sent') return <Icon name="Check" size={12} className="text-muted-foreground" />;
  if (status === 'delivered') return <Icon name="CheckCheck" size={12} className="text-muted-foreground" />;
  return <Icon name="CheckCheck" size={12} className="text-primary" />;
}

export default function ChatWindow({ chat, onBack, onBlock, onUnblock }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(chat.messages);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(chat.messages);
  }, [chat.id, chat.messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const send = () => {
    if (!text.trim() || chat.blocked) return;
    const msg: Message = {
      id: messages.length + 1,
      text: text.trim(),
      time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      isOut: true,
      status: 'sent',
    };
    setMessages((prev) => [...prev, msg]);
    setText('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const statusLabel = chat.status === 'online' ? 'В сети' : chat.status === 'away' ? 'Недавно был(а)' : 'Не в сети';

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border glass-panel">
        <button onClick={onBack} className="md:hidden text-muted-foreground hover:text-foreground mr-1">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-sm font-semibold">
            {chat.avatar}
          </div>
          {!chat.isGroup && !chat.blocked && (
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card
              ${chat.status === 'online' ? 'status-online' : chat.status === 'away' ? 'status-away' : 'bg-muted-foreground'}`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{chat.name}</span>
            {chat.blocked && (
              <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-medium">заблокирован</span>
            )}
          </div>
          {!chat.isGroup && (
            <span className={`text-xs ${chat.status === 'online' ? 'text-green-400' : 'text-muted-foreground'}`}>
              {statusLabel}
            </span>
          )}
          {chat.isGroup && (
            <span className="text-xs text-muted-foreground">Группа</span>
          )}
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Icon name="MoreVertical" size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-44 glass-panel border border-border rounded-xl shadow-xl z-50 py-1 animate-scale-in">
              {!chat.blocked ? (
                <button
                  onClick={() => { onBlock(chat.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary/50 transition-colors"
                >
                  <Icon name="Ban" size={15} />
                  Заблокировать
                </button>
              ) : (
                <button
                  onClick={() => { onUnblock(chat.id); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <Icon name="ShieldOff" size={15} />
                  Разблокировать
                </button>
              )}
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors">
                <Icon name="Search" size={15} />
                Поиск в чате
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors">
                <Icon name="Trash2" size={15} />
                Удалить чат
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`flex ${msg.isOut ? 'justify-end' : 'justify-start'} animate-fade-in`}
            style={{ animationDelay: `${i * 20}ms` }}
          >
            <div className={`max-w-[68%] px-3.5 py-2.5 text-sm leading-relaxed
              ${msg.isOut ? 'msg-bubble-out text-foreground' : 'msg-bubble-in text-foreground'}`}
            >
              <p>{msg.text}</p>
              <div className={`flex items-center gap-1 mt-1 ${msg.isOut ? 'justify-end' : 'justify-start'}`}>
                <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                {msg.isOut && <StatusIcon status={msg.status} />}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {chat.blocked ? (
        <div className="px-4 py-4 border-t border-border flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Icon name="Ban" size={16} />
          Этот пользователь заблокирован
        </div>
      ) : (
        <div className="px-4 py-3 border-t border-border flex items-end gap-2">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0">
            <Icon name="Paperclip" size={18} />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Написать сообщение..."
            rows={1}
            className="flex-1 bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 resize-none transition-all"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all
              ${text.trim() ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}
          >
            <Icon name="Send" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
