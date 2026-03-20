export type ChatStatus = 'online' | 'away' | 'offline';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface Message {
  id: number;
  text: string;
  time: string;
  isOut: boolean;
  status?: MessageStatus;
}

export interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  status: ChatStatus;
  isGroup?: boolean;
  messages: Message[];
  blocked?: boolean;
}

export interface Notification {
  id: number;
  text: string;
  time: string;
  read: boolean;
  chatId: number;
}

export const CHATS: Chat[] = [
  {
    id: 1,
    name: 'Алексей Морозов',
    avatar: 'АМ',
    lastMessage: 'Отлично, жду тебя в 18:00!',
    time: '14:32',
    unread: 2,
    status: 'online',
    messages: [
      { id: 1, text: 'Привет! Как дела?', time: '14:10', isOut: false },
      { id: 2, text: 'Всё отлично, спасибо! Ты как?', time: '14:12', isOut: true, status: 'read' },
      { id: 3, text: 'Тоже хорошо. Встретимся сегодня?', time: '14:20', isOut: false },
      { id: 4, text: 'Да, конечно! В котором часу?', time: '14:25', isOut: true, status: 'read' },
      { id: 5, text: 'Отлично, жду тебя в 18:00!', time: '14:32', isOut: false },
    ],
  },
  {
    id: 2,
    name: 'Команда проекта',
    avatar: 'КП',
    lastMessage: 'Марина: Дедлайн перенесли на пятницу',
    time: '13:15',
    unread: 5,
    status: 'online',
    isGroup: true,
    messages: [
      { id: 1, text: 'Всем привет! Начинаем обсуждение проекта', time: '10:00', isOut: false },
      { id: 2, text: 'Готов, давайте!', time: '10:05', isOut: true, status: 'read' },
      { id: 3, text: 'Я изучил требования, есть вопросы', time: '10:15', isOut: false },
      { id: 4, text: 'Дедлайн перенесли на пятницу', time: '13:15', isOut: false },
    ],
  },
  {
    id: 3,
    name: 'Елена Соколова',
    avatar: 'ЕС',
    lastMessage: 'Посмотри документ, который я отправила',
    time: '11:40',
    unread: 0,
    status: 'away',
    messages: [
      { id: 1, text: 'Привет! Посмотри документ, который я отправила', time: '11:40', isOut: false },
      { id: 2, text: 'Уже смотрю, спасибо!', time: '11:45', isOut: true, status: 'read' },
    ],
  },
  {
    id: 4,
    name: 'Иван Петров',
    avatar: 'ИП',
    lastMessage: 'Окей, понял тебя',
    time: 'Вчера',
    unread: 0,
    status: 'offline',
    messages: [
      { id: 1, text: 'Нужно обсудить детали контракта', time: 'Вчера', isOut: true, status: 'read' },
      { id: 2, text: 'Окей, понял тебя', time: 'Вчера', isOut: false },
    ],
  },
  {
    id: 5,
    name: 'Друзья',
    avatar: '👥',
    lastMessage: 'Саша: Где встречаемся в эти выходные?',
    time: 'Вчера',
    unread: 12,
    status: 'online',
    isGroup: true,
    messages: [
      { id: 1, text: 'Ребята, планируем встречу?', time: 'Вчера', isOut: true, status: 'read' },
      { id: 2, text: 'Я за!', time: 'Вчера', isOut: false },
      { id: 3, text: 'Где встречаемся в эти выходные?', time: 'Вчера', isOut: false },
    ],
  },
  {
    id: 6,
    name: 'Дмитрий Волков',
    avatar: 'ДВ',
    lastMessage: 'Спасибо за помощь!',
    time: 'Пн',
    unread: 0,
    status: 'offline',
    blocked: true,
    messages: [
      { id: 1, text: 'Спасибо за помощь!', time: 'Пн', isOut: false },
    ],
  },
];

export const NOTIFICATIONS: Notification[] = [
  { id: 1, text: 'Алексей Морозов написал вам сообщение', time: '14:32', read: false, chatId: 1 },
  { id: 2, text: 'Команда проекта: новое сообщение от Марины', time: '13:15', read: false, chatId: 2 },
  { id: 3, text: 'Друзья: 12 новых сообщений', time: 'Вчера', read: false, chatId: 5 },
  { id: 4, text: 'Елена Соколова отправила файл', time: '11:40', read: true, chatId: 3 },
  { id: 5, text: 'Иван Петров ответил на ваше сообщение', time: 'Вчера', read: true, chatId: 4 },
];
