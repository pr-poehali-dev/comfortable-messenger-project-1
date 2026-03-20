import { useState } from 'react';
import Icon from '@/components/ui/icon';

type UserStatus = 'online' | 'away' | 'offline';

const STATUS_OPTIONS: { value: UserStatus; label: string; color: string }[] = [
  { value: 'online', label: 'В сети', color: 'bg-green-400' },
  { value: 'away', label: 'Недавно был(а)', color: 'bg-yellow-400' },
  { value: 'offline', label: 'Невидимка', color: 'bg-muted-foreground' },
];

export default function Profile() {
  const [name, setName] = useState('Вы');
  const [username, setUsername] = useState('@you');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState<UserStatus>('online');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status)!;

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-semibold text-base text-foreground">Профиль</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar block */}
        <div className="flex flex-col items-center pt-8 pb-6 px-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
              {name.slice(0, 2).toUpperCase()}
            </div>
            <button className="absolute inset-0 rounded-3xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Icon name="Camera" size={22} className="text-white" />
            </button>
          </div>

          <div className="mt-4 text-center">
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary rounded-lg px-3 py-1.5 text-center text-lg font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary/40"
              />
            ) : (
              <h3 className="text-xl font-semibold text-foreground">{name}</h3>
            )}
            <p className="text-sm text-muted-foreground mt-1">{username}</p>
          </div>

          {/* Status selector */}
          <div className="mt-4 flex gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${status === s.value ? 'bg-secondary border border-border text-foreground' : 'text-muted-foreground hover:bg-secondary/50'}`}
              >
                <span className={`w-2 h-2 rounded-full ${s.color}`} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info fields */}
        <div className="px-6 space-y-3 pb-6">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Имя</label>
              {editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block mt-1 w-full bg-transparent text-sm text-foreground outline-none"
                />
              ) : (
                <p className="text-sm text-foreground mt-1">{name}</p>
              )}
            </div>
            <div className="px-4 py-3 border-b border-border">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Имя пользователя</label>
              {editing ? (
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block mt-1 w-full bg-transparent text-sm text-foreground outline-none"
                />
              ) : (
                <p className="text-sm text-foreground mt-1">{username}</p>
              )}
            </div>
            <div className="px-4 py-3">
              <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">О себе</label>
              {editing ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Расскажите о себе..."
                  rows={2}
                  className="block mt-1 w-full bg-transparent text-sm text-foreground outline-none resize-none placeholder:text-muted-foreground"
                />
              ) : (
                <p className="text-sm text-foreground mt-1">{bio || <span className="text-muted-foreground">Не указано</span>}</p>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${currentStatus.color}`} />
            <div>
              <p className="text-xs text-muted-foreground">Статус</p>
              <p className="text-sm text-foreground font-medium">{currentStatus.label}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-secondary/70 transition-colors"
                >
                  Отмена
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex-1 bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-secondary/70 transition-colors flex items-center justify-center gap-2"
              >
                <Icon name="Pencil" size={15} />
                Редактировать профиль
              </button>
            )}
          </div>

          {saved && (
            <p className="text-center text-xs text-green-400 animate-fade-in">
              ✓ Профиль сохранён
            </p>
          )}
        </div>
      </div>
    </div>
  );
}