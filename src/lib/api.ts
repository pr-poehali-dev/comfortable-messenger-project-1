const URLS = {
  auth: 'https://functions.poehali.dev/6576060b-2402-4dc8-a891-8e144a4203b1',
  messages: 'https://functions.poehali.dev/3ec9bd41-7fde-4152-9123-f20d32e5ae96',
  profile: 'https://functions.poehali.dev/b002544b-e8fc-4adc-90ea-99fbac8a5953',
};

export const SESSION_KEY = 'volna_session';
export const USER_KEY = 'volna_user';

export function getSession(): string {
  return localStorage.getItem(SESSION_KEY) || '';
}

export function getUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function saveSession(session_id: string, user: User) {
  localStorage.setItem(SESSION_KEY, session_id);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_KEY);
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_initials: string;
  avatar_url?: string;
  bio?: string;
}

export interface ApiChat {
  id: number;
  is_group: boolean;
  name: string;
  avatar: string;
  last_message: string;
  last_at: string;
  unread: number;
  blocked: boolean;
  other_user_id?: number;
  avatar_url?: string;
}

export interface ApiMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string | null;
  msg_type: 'text' | 'audio' | 'video';
  media_url: string | null;
  media_duration: number | null;
  created_at: string;
  is_out: boolean;
}

export interface Contact {
  id: number;
  username: string;
  display_name: string;
  avatar_initials: string;
  avatar_url: string;
}

function headers(): HeadersInit {
  const sid = getSession();
  return { 'Content-Type': 'application/json', ...(sid ? { 'X-Session-Id': sid } : {}) };
}

async function call(fn: keyof typeof URLS, path: string, method = 'GET', body?: object) {
  const url = URLS[fn] + path;
  const res = await fetch(url, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

// Auth
export const authApi = {
  register: (username: string, display_name: string, password: string) =>
    call('auth', '/register', 'POST', { username, display_name, password }),
  login: (username: string, password: string) =>
    call('auth', '/login', 'POST', { username, password }),
  logout: () => call('auth', '/logout', 'POST'),
  me: () => call('auth', '/me', 'GET'),
};

// Messages
export const messagesApi = {
  getChats: (): Promise<ApiChat[]> => call('messages', '/chats', 'GET'),
  getMessages: (chat_id: number): Promise<ApiMessage[]> =>
    call('messages', `/messages?chat_id=${chat_id}`, 'GET'),
  send: (chat_id: number, content: string) =>
    call('messages', '/send', 'POST', { chat_id, content }),
  uploadMedia: (chat_id: number, data: string, mime: string, media_type: 'audio' | 'video', duration: number) =>
    call('messages', '/upload-media', 'POST', { chat_id, data, mime, media_type, duration }),
  createChat: (member_ids: number[], is_group = false, group_name = '') =>
    call('messages', '/create-chat', 'POST', { member_ids, is_group, group_name }),
};

// Profile
export const profileApi = {
  uploadAvatar: (data: string, mime: string) =>
    call('profile', '/avatar', 'POST', { data, mime }),
  update: (display_name: string, bio: string) =>
    call('profile', '/update', 'POST', { display_name, bio }),
  getContacts: (): Promise<Contact[]> => call('profile', '/contacts', 'GET'),
  addContact: (username: string) => call('profile', '/add-contact', 'POST', { username }),
  search: (q: string): Promise<Contact[]> => call('profile', `/search?q=${encodeURIComponent(q)}`, 'GET'),
};

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Вчера';
  if (days < 7) return d.toLocaleDateString('ru-RU', { weekday: 'short' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
