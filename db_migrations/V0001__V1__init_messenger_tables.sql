CREATE TABLE t_p41294516_comfortable_messenge.users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_initials VARCHAR(4),
  bio TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p41294516_comfortable_messenge.sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p41294516_comfortable_messenge.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '30 days'
);

CREATE TABLE t_p41294516_comfortable_messenge.chats (
  id SERIAL PRIMARY KEY,
  is_group BOOLEAN DEFAULT FALSE,
  group_name VARCHAR(100),
  created_by INTEGER REFERENCES t_p41294516_comfortable_messenge.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p41294516_comfortable_messenge.chat_members (
  chat_id INTEGER NOT NULL REFERENCES t_p41294516_comfortable_messenge.chats(id),
  user_id INTEGER NOT NULL REFERENCES t_p41294516_comfortable_messenge.users(id),
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE t_p41294516_comfortable_messenge.messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES t_p41294516_comfortable_messenge.chats(id),
  sender_id INTEGER NOT NULL REFERENCES t_p41294516_comfortable_messenge.users(id),
  content TEXT,
  msg_type VARCHAR(20) DEFAULT 'text',
  media_url TEXT,
  media_duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
)
