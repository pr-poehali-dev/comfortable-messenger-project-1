"""
Профиль пользователя: загрузка аватара в S3, обновление данных профиля,
синхронизация контактов (поиск пользователей + добавление в контакты).
POST /avatar        — загрузить фото аватара (base64)
POST /update        — обновить имя/bio
GET  /contacts      — список контактов (пользователи, с которыми есть чат или добавлены вручную)
POST /add-contact   — добавить контакт по username
GET  /search?q=...  — поиск пользователей
"""

import json, os, base64, secrets, psycopg2, boto3

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p41294516_comfortable_messenge')
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


def ok(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}


def err(msg, status=400):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def get_user_id(cur, session_id):
    if not session_id:
        return None
    cur.execute(f'SELECT user_id FROM {SCHEMA}.sessions WHERE id = %s AND expires_at > NOW()', (session_id,))
    row = cur.fetchone()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    qs = event.get('queryStringParameters') or {}
    body = {}
    if event.get('body'):
        body = json.loads(event['body'])

    headers = event.get('headers') or {}
    session_id = headers.get('X-Session-Id') or headers.get('x-session-id', '')

    conn = get_conn()
    cur = conn.cursor()

    try:
        user_id = get_user_id(cur, session_id)
        if not user_id and not path.endswith('/search'):
            return err('Не авторизован', 401)

        # POST /avatar — загрузка фото
        if path.endswith('/avatar') and method == 'POST':
            data_b64 = body.get('data')
            mime = body.get('mime', 'image/jpeg')
            if not data_b64:
                return err('Нет данных изображения')

            raw = base64.b64decode(data_b64)
            if len(raw) > 5 * 1024 * 1024:
                return err('Файл слишком большой (максимум 5 МБ)')

            ext = 'jpg'
            if 'png' in mime:
                ext = 'png'
            elif 'webp' in mime:
                ext = 'webp'

            key = f'messenger/avatars/{user_id}/{secrets.token_hex(8)}.{ext}'
            s3 = get_s3()
            s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=mime)
            cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

            cur.execute(f'ALTER TABLE {SCHEMA}.users ADD COLUMN IF NOT EXISTS avatar_url TEXT')
            cur.execute(f'UPDATE {SCHEMA}.users SET avatar_url = %s WHERE id = %s', (cdn_url, user_id))
            conn.commit()
            return ok({'avatar_url': cdn_url})

        # POST /update — обновление профиля
        elif path.endswith('/update') and method == 'POST':
            display_name = (body.get('display_name') or '').strip()
            bio = (body.get('bio') or '').strip()
            if not display_name:
                return err('Имя не может быть пустым')
            initials = ''.join([w[0].upper() for w in display_name.split()[:2]])
            cur.execute(
                f'UPDATE {SCHEMA}.users SET display_name = %s, bio = %s, avatar_initials = %s WHERE id = %s',
                (display_name, bio, initials, user_id)
            )
            conn.commit()
            return ok({'ok': True, 'display_name': display_name, 'avatar_initials': initials})

        # GET /contacts — список контактов
        elif path.endswith('/contacts') and method == 'GET':
            # Контакты = все пользователи, с которыми есть личный чат
            cur.execute(f'''
                SELECT DISTINCT u.id, u.username, u.display_name, u.avatar_initials,
                       COALESCE(u.avatar_url, '') as avatar_url
                FROM {SCHEMA}.chat_members cm1
                JOIN {SCHEMA}.chats c ON c.id = cm1.chat_id AND c.is_group = FALSE
                JOIN {SCHEMA}.chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id != %s
                JOIN {SCHEMA}.users u ON u.id = cm2.user_id
                WHERE cm1.user_id = %s
                ORDER BY u.display_name
            ''', (user_id, user_id))
            rows = cur.fetchall()
            contacts = [{'id': r[0], 'username': r[1], 'display_name': r[2], 'avatar_initials': r[3], 'avatar_url': r[4]} for r in rows]
            return ok(contacts)

        # POST /add-contact — добавить контакт (создать чат)
        elif path.endswith('/add-contact') and method == 'POST':
            username = (body.get('username') or '').strip().lower()
            if not username:
                return err('Укажите имя пользователя')
            cur.execute(
                f'SELECT id, display_name, avatar_initials FROM {SCHEMA}.users WHERE username = %s AND id != %s',
                (username, user_id)
            )
            row = cur.fetchone()
            if not row:
                return err('Пользователь не найден')
            other_id, other_name, other_init = row

            # Проверить нет ли уже чата
            cur.execute(f'''
                SELECT c.id FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = %s
                JOIN {SCHEMA}.chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = %s
                WHERE c.is_group = FALSE
            ''', (user_id, other_id))
            existing = cur.fetchone()
            if existing:
                return ok({'chat_id': existing[0], 'already_exists': True, 'contact': {'id': other_id, 'display_name': other_name, 'avatar_initials': other_init}})

            cur.execute(f'INSERT INTO {SCHEMA}.chats (is_group, created_by) VALUES (FALSE, %s) RETURNING id', (user_id,))
            chat_id = cur.fetchone()[0]
            cur.execute(f'INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s, %s)', (chat_id, user_id))
            cur.execute(f'INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s, %s)', (chat_id, other_id))
            conn.commit()
            return ok({'chat_id': chat_id, 'already_exists': False, 'contact': {'id': other_id, 'display_name': other_name, 'avatar_initials': other_init}}, 201)

        # GET /search?q=... — поиск пользователей
        elif path.endswith('/search') and method == 'GET':
            if not user_id:
                return err('Не авторизован', 401)
            q = (qs.get('q') or '').strip()
            if len(q) < 2:
                return ok([])
            cur.execute(
                f'''SELECT id, username, display_name, avatar_initials, COALESCE(avatar_url, '') as avatar_url
                    FROM {SCHEMA}.users
                    WHERE (username ILIKE %s OR display_name ILIKE %s) AND id != %s
                    LIMIT 20''',
                (f'%{q}%', f'%{q}%', user_id)
            )
            rows = cur.fetchall()
            return ok([{'id': r[0], 'username': r[1], 'display_name': r[2], 'avatar_initials': r[3], 'avatar_url': r[4]} for r in rows])

        return err('Не найдено', 404)

    finally:
        cur.close()
        conn.close()
