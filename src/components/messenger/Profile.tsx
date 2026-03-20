import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { User, profileApi, authApi, fileToBase64, clearSession, Contact } from '@/lib/api';

type UserStatus = 'online' | 'away' | 'offline';

const STATUS_OPTIONS: { value: UserStatus; label: string; color: string }[] = [
  { value: 'online', label: 'В сети', color: 'bg-green-400' },
  { value: 'away', label: 'Недавно был(а)', color: 'bg-yellow-400' },
  { value: 'offline', label: 'Невидимка', color: 'bg-muted-foreground' },
];

interface ProfileProps {
  user: User;
  onUserUpdate: (user: User) => void;
  onLogout: () => void;
  onOpenChat: (userId: number) => void;
}

type ProfileTab = 'info' | 'contacts';

export default function Profile({ user, onUserUpdate, onLogout, onOpenChat }: ProfileProps) {
  const [tab, setTab] = useState<ProfileTab>('info');
  const [displayName, setDisplayName] = useState(user.display_name);
  const [bio, setBio] = useState(user.bio || '');
  const [status, setStatus] = useState<UserStatus>('online');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingUsername, setAddingUsername] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab === 'contacts') loadContacts();
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery.length >= 2) doSearch();
      else setSearchResults([]);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadContacts = async () => {
    setContactsLoading(true);
    try {
      const list = await profileApi.getContacts();
      setContacts(list);
    } catch (e) {
      console.error(e);
    }
    setContactsLoading(false);
  };

  const doSearch = async () => {
    setSearching(true);
    try {
      const res = await profileApi.search(searchQuery);
      setSearchResults(res);
    } catch (e) {
      console.error(e);
    }
    setSearching(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await profileApi.uploadAvatar(b64, file.type);
      setAvatarUrl(res.avatar_url);
      onUserUpdate({ ...user, avatar_url: res.avatar_url });
    } catch (e) {
      console.error(e);
    }
    setAvatarLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await profileApi.update(displayName, bio);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing(false);
      onUserUpdate({ ...user, display_name: res.display_name, avatar_initials: res.avatar_initials, bio });
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleAddContact = async () => {
    if (!addingUsername.trim()) return;
    setAddError('');
    setAddSuccess('');
    try {
      const res = await profileApi.addContact(addingUsername.trim());
      if (res.already_exists) {
        setAddSuccess(`${res.contact.display_name} уже в контактах`);
      } else {
        setAddSuccess(`${res.contact.display_name} добавлен!`);
        await loadContacts();
      }
      setAddingUsername('');
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Ошибка');
    }
  };

  const handleAddFromSearch = async (contact: Contact) => {
    try {
      const res = await profileApi.addContact(contact.username);
      if (!res.already_exists) await loadContacts();
      onOpenChat(res.chat_id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch (e) { console.error(e); }
    clearSession();
    onLogout();
  };

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === status)!;
  const initials = user.avatar_initials || user.display_name.slice(0, 2).toUpperCase();

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold text-base text-foreground">Профиль</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setTab('info')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === 'info' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Инфо
          </button>
          <button
            onClick={() => setTab('contacts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === 'contacts' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'}`}
          >
            Контакты
          </button>
        </div>
      </div>

      {tab === 'info' && (
        <div className="flex-1 overflow-y-auto">
          {/* Avatar */}
          <div className="flex flex-col items-center pt-8 pb-6 px-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl overflow-hidden bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={avatarLoading}
                className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {avatarLoading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Icon name="Camera" size={22} className="text-white" />
                }
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Нажмите, чтобы сменить фото</p>

            <div className="mt-3 text-center">
              <h3 className="text-xl font-semibold text-foreground">{user.display_name}</h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>

            <div className="mt-4 flex gap-2 flex-wrap justify-center">
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

          <div className="px-6 space-y-3 pb-6">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Имя</label>
                {editing ? (
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="block mt-1 w-full bg-transparent text-sm text-foreground outline-none"
                  />
                ) : (
                  <p className="text-sm text-foreground mt-1">{user.display_name}</p>
                )}
              </div>
              <div className="px-4 py-3 border-b border-border">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Имя пользователя</label>
                <p className="text-sm text-foreground mt-1">@{user.username}</p>
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

            <div className="bg-card rounded-2xl border border-border px-4 py-3 flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${currentStatus.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">Статус</p>
                <p className="text-sm text-foreground font-medium">{currentStatus.label}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              {editing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {saving && <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
                    Сохранить
                  </button>
                  <button onClick={() => setEditing(false)} className="flex-1 bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-secondary/70 transition-colors">
                    Отмена
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-secondary/70 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="Pencil" size={15} />
                  Редактировать
                </button>
              )}
            </div>

            {saved && <p className="text-center text-xs text-green-400 animate-fade-in">✓ Профиль сохранён</p>}

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive rounded-xl py-2.5 text-sm font-medium hover:bg-destructive/20 transition-colors mt-2"
            >
              <Icon name="LogOut" size={15} />
              Выйти из аккаунта
            </button>
          </div>
        </div>
      )}

      {tab === 'contacts' && (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Add contact */}
          <div className="px-4 pt-4 pb-3 border-b border-border space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Добавить контакт</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Icon name="AtSign" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={addingUsername}
                  onChange={(e) => setAddingUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddContact()}
                  placeholder="username"
                  className="w-full bg-secondary rounded-xl pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <button
                onClick={handleAddContact}
                className="bg-primary text-primary-foreground rounded-xl px-3 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Icon name="UserPlus" size={16} />
              </button>
            </div>
            {addError && <p className="text-xs text-destructive animate-fade-in">{addError}</p>}
            {addSuccess && <p className="text-xs text-green-400 animate-fade-in">{addSuccess}</p>}

            {/* Search */}
            <div className="relative">
              <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск пользователей..."
                className="w-full bg-secondary rounded-xl pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
              />
              {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />}
            </div>
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs text-muted-foreground mb-2">Найдено:</p>
              <div className="space-y-1">
                {searchResults.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary overflow-hidden">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : c.avatar_initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{c.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{c.username}</p>
                    </div>
                    <button
                      onClick={() => handleAddFromSearch(c)}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      <Icon name="MessageCircle" size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contacts list */}
          <div className="flex-1 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">
              Мои контакты {contacts.length > 0 && `(${contacts.length})`}
            </p>
            {contactsLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3 text-muted-foreground">
                <Icon name="Users" size={36} />
                <p className="text-sm text-center">Контактов пока нет.<br />Добавьте первый контакт выше.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {contacts.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => handleAddFromSearch(c)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/60 transition-all text-left animate-fade-in"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-sm font-semibold overflow-hidden shrink-0">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : c.avatar_initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{c.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{c.username}</p>
                    </div>
                    <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}