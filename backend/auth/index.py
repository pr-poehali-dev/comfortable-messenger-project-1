"""
Авторизация и регистрация пользователей мессенджера.
POST /register — регистрация
POST /login — вход
POST /logout — выход
GET /me — получить текущего пользователя по сессии
"""

import json
import os
import hashlib
import secrets
import psycopg2

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p41294516_comfortable_messenge')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def ok(data: dict, status: int = 200) -> dict:
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data)}


def err(msg: str, status: int = 400) -> dict:
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    session_id = event.get('headers', {}).get('X-Session-Id') or event.get('headers', {}).get('x-session-id', '')

    conn = get_conn()
    cur = conn.cursor()

    try:
        if path.endswith('/register') and method == 'POST':
            username = (body.get('username') or '').strip().lower()
            display_name = (body.get('display_name') or '').strip()
            password = body.get('password', '')

            if not username or not display_name or not password:
                return err('Заполните все поля')
            if len(username) < 3:
                return err('Имя пользователя минимум 3 символа')
            if len(password) < 6:
                return err('Пароль минимум 6 символов')

            cur.execute(f'SELECT id FROM {SCHEMA}.users WHERE username = %s', (username,))
            if cur.fetchone():
                return err('Пользователь с таким именем уже существует')

            initials = ''.join([w[0].upper() for w in display_name.split()[:2]])
            pw_hash = hash_password(password)
            cur.execute(
                f'INSERT INTO {SCHEMA}.users (username, display_name, password_hash, avatar_initials) VALUES (%s, %s, %s, %s) RETURNING id',
                (username, display_name, pw_hash, initials)
            )
            user_id = cur.fetchone()[0]

            sid = secrets.token_hex(32)
            cur.execute(f'INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s, %s)', (sid, user_id))
            conn.commit()

            return ok({'session_id': sid, 'user': {'id': user_id, 'username': username, 'display_name': display_name, 'avatar_initials': initials}}, 201)

        elif path.endswith('/login') and method == 'POST':
            username = (body.get('username') or '').strip().lower()
            password = body.get('password', '')

            if not username or not password:
                return err('Введите логин и пароль')

            pw_hash = hash_password(password)
            cur.execute(
                f'SELECT id, username, display_name, avatar_initials FROM {SCHEMA}.users WHERE username = %s AND password_hash = %s',
                (username, pw_hash)
            )
            row = cur.fetchone()
            if not row:
                return err('Неверный логин или пароль')

            user_id, uname, dname, initials = row
            sid = secrets.token_hex(32)
            cur.execute(f'INSERT INTO {SCHEMA}.sessions (id, user_id) VALUES (%s, %s)', (sid, user_id))
            conn.commit()

            return ok({'session_id': sid, 'user': {'id': user_id, 'username': uname, 'display_name': dname, 'avatar_initials': initials}})

        elif path.endswith('/logout') and method == 'POST':
            if session_id:
                cur.execute(f'UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE id = %s', (session_id,))
                conn.commit()
            return ok({'ok': True})

        elif path.endswith('/me') and method == 'GET':
            if not session_id:
                return err('Не авторизован', 401)
            cur.execute(
                f'''SELECT u.id, u.username, u.display_name, u.avatar_initials, u.bio
                    FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON s.user_id = u.id
                    WHERE s.id = %s AND s.expires_at > NOW()''',
                (session_id,)
            )
            row = cur.fetchone()
            if not row:
                return err('Сессия истекла', 401)
            uid, uname, dname, initials, bio = row
            return ok({'id': uid, 'username': uname, 'display_name': dname, 'avatar_initials': initials, 'bio': bio or ''})

        return err('Не найдено', 404)

    finally:
        cur.close()
        conn.close()
