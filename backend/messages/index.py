"""
Сообщения мессенджера: отправка текста, голосовых и видеосообщений, получение чатов.
GET /chats — список чатов пользователя
GET /messages?chat_id=X — сообщения чата
POST /send — отправить текстовое сообщение
POST /upload-media — загрузить голосовое/видеосообщение (base64)
POST /create-chat — создать личный или групповой чат
GET /users?q=... — поиск пользователей
"""

import json
import os
import base64
import boto3
import psycopg2
import secrets

SCHEMA = os.environ.get('MAIN_DB_SCHEMA', 't_p41294516_comfortable_messenge')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
}


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def ok(data, status=200):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=str)}


def err(msg, status=400):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def get_user_id(cur, session_id):
    if not session_id:
        return None
    cur.execute(
        f'SELECT user_id FROM {SCHEMA}.sessions WHERE id = %s AND expires_at > NOW()',
        (session_id,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )


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

        # GET /users?q=...
        if path.endswith('/users') and method == 'GET':
            if not user_id:
                return err('Не авторизован', 401)
            q = qs.get('q', '').strip()
            if len(q) < 2:
                return ok([])
            cur.execute(
                f"SELECT id, username, display_name, avatar_initials FROM {SCHEMA}.users WHERE (username ILIKE %s OR display_name ILIKE %s) AND id != %s LIMIT 20",
                (f'%{q}%', f'%{q}%', user_id)
            )
            rows = cur.fetchall()
            users = [{'id': r[0], 'username': r[1], 'display_name': r[2], 'avatar_initials': r[3]} for r in rows]
            return ok(users)

        # GET /chats
        elif path.endswith('/chats') and method == 'GET':
            if not user_id:
                return err('Не авторизован', 401)
            cur.execute(f'''
                SELECT c.id, c.is_group, c.group_name,
                       u.id, u.username, u.display_name, u.avatar_initials,
                       m.content, m.msg_type, m.media_url, m.created_at,
                       cm2.is_blocked
                FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.chat_members cm ON cm.chat_id = c.id AND cm.user_id = %s
                LEFT JOIN {SCHEMA}.chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id != %s AND NOT c.is_group
                LEFT JOIN {SCHEMA}.users u ON u.id = cm2.user_id
                LEFT JOIN LATERAL (
                    SELECT content, msg_type, media_url, created_at FROM {SCHEMA}.messages
                    WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
                ) m ON true
                ORDER BY m.created_at DESC NULLS LAST
            ''', (user_id, user_id))
            rows = cur.fetchall()

            chats = []
            for r in rows:
                chat_id, is_group, group_name, other_uid, other_uname, other_dname, other_init, last_content, last_type, last_url, last_at, is_blocked = r
                if is_group:
                    name = group_name or 'Группа'
                    avatar = (group_name or 'Г')[:2].upper()
                else:
                    name = other_dname or 'Пользователь'
                    avatar = other_init or '??'

                last_msg = ''
                if last_type == 'text':
                    last_msg = last_content or ''
                elif last_type == 'audio':
                    last_msg = '🎤 Голосовое сообщение'
                elif last_type == 'video':
                    last_msg = '📹 Видеосообщение'

                cur.execute(
                    f'SELECT COUNT(*) FROM {SCHEMA}.messages WHERE chat_id = %s',
                    (chat_id,)
                )
                unread = 0

                chats.append({
                    'id': chat_id,
                    'is_group': is_group,
                    'name': name,
                    'avatar': avatar,
                    'last_message': last_msg,
                    'last_at': str(last_at) if last_at else '',
                    'unread': unread,
                    'blocked': bool(is_blocked),
                    'other_user_id': other_uid,
                })
            return ok(chats)

        # GET /messages?chat_id=X
        elif path.endswith('/messages') and method == 'GET':
            if not user_id:
                return err('Не авторизован', 401)
            chat_id = qs.get('chat_id')
            if not chat_id:
                return err('chat_id обязателен')
            cur.execute(f'SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s', (chat_id, user_id))
            if not cur.fetchone():
                return err('Доступ запрещён', 403)
            cur.execute(f'''
                SELECT m.id, m.sender_id, u.display_name, m.content, m.msg_type, m.media_url, m.media_duration, m.created_at
                FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.users u ON u.id = m.sender_id
                WHERE m.chat_id = %s ORDER BY m.created_at ASC LIMIT 200
            ''', (chat_id,))
            rows = cur.fetchall()
            messages = [{
                'id': r[0],
                'sender_id': r[1],
                'sender_name': r[2],
                'content': r[3],
                'msg_type': r[4],
                'media_url': r[5],
                'media_duration': r[6],
                'created_at': str(r[7]),
                'is_out': r[1] == user_id,
            } for r in rows]
            return ok(messages)

        # POST /send
        elif path.endswith('/send') and method == 'POST':
            if not user_id:
                return err('Не авторизован', 401)
            chat_id = body.get('chat_id')
            content = (body.get('content') or '').strip()
            if not chat_id or not content:
                return err('Не указан chat_id или content')
            cur.execute(f'SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s', (chat_id, user_id))
            if not cur.fetchone():
                return err('Доступ запрещён', 403)
            cur.execute(
                f'INSERT INTO {SCHEMA}.messages (chat_id, sender_id, content, msg_type) VALUES (%s, %s, %s, %s) RETURNING id, created_at',
                (chat_id, user_id, content, 'text')
            )
            msg_id, created_at = cur.fetchone()
            conn.commit()
            return ok({'id': msg_id, 'created_at': str(created_at)}, 201)

        # POST /upload-media
        elif path.endswith('/upload-media') and method == 'POST':
            if not user_id:
                return err('Не авторизован', 401)
            chat_id = body.get('chat_id')
            media_type = body.get('media_type', 'audio')
            data_b64 = body.get('data')
            mime = body.get('mime', 'audio/webm')
            duration = body.get('duration', 0)

            if not chat_id or not data_b64:
                return err('Не хватает данных')
            cur.execute(f'SELECT 1 FROM {SCHEMA}.chat_members WHERE chat_id = %s AND user_id = %s', (chat_id, user_id))
            if not cur.fetchone():
                return err('Доступ запрещён', 403)

            raw = base64.b64decode(data_b64)
            ext = 'webm' if 'webm' in mime else ('mp4' if 'mp4' in mime else 'bin')
            key = f'messenger/{media_type}/{secrets.token_hex(16)}.{ext}'

            s3 = get_s3()
            s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=mime)

            cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"

            cur.execute(
                f'INSERT INTO {SCHEMA}.messages (chat_id, sender_id, msg_type, media_url, media_duration) VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at',
                (chat_id, user_id, media_type, cdn_url, duration)
            )
            msg_id, created_at = cur.fetchone()
            conn.commit()
            return ok({'id': msg_id, 'media_url': cdn_url, 'created_at': str(created_at)}, 201)

        # POST /create-chat
        elif path.endswith('/create-chat') and method == 'POST':
            if not user_id:
                return err('Не авторизован', 401)
            is_group = body.get('is_group', False)
            member_ids = body.get('member_ids', [])
            group_name = body.get('group_name', '')

            if not member_ids:
                return err('Не указаны участники')

            if not is_group:
                other_id = member_ids[0]
                cur.execute(f'''
                    SELECT c.id FROM {SCHEMA}.chats c
                    JOIN {SCHEMA}.chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = %s
                    JOIN {SCHEMA}.chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = %s
                    WHERE c.is_group = FALSE
                ''', (user_id, other_id))
                existing = cur.fetchone()
                if existing:
                    return ok({'chat_id': existing[0]})

            cur.execute(
                f'INSERT INTO {SCHEMA}.chats (is_group, group_name, created_by) VALUES (%s, %s, %s) RETURNING id',
                (is_group, group_name if is_group else None, user_id)
            )
            chat_id = cur.fetchone()[0]

            all_members = list(set([user_id] + member_ids))
            for mid in all_members:
                cur.execute(
                    f'INSERT INTO {SCHEMA}.chat_members (chat_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING',
                    (chat_id, mid)
                )
            conn.commit()
            return ok({'chat_id': chat_id}, 201)

        return err('Не найдено', 404)

    finally:
        cur.close()
        conn.close()
