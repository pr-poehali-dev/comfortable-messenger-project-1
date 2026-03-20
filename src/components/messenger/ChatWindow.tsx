import { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '@/components/ui/icon';
import { ApiMessage, ApiChat, messagesApi, blobToBase64, formatTime } from '@/lib/api';

interface ChatWindowProps {
  chat: ApiChat;
  currentUserId: number;
  onBack: () => void;
  onBlock: (id: number) => void;
  onUnblock: (id: number) => void;
}

function AudioPlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => setProgress(audioRef.current ? audioRef.current.currentTime / (audioRef.current.duration || 1) : 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button onClick={toggle} className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors shrink-0">
        <Icon name={playing ? 'Pause' : 'Play'} size={14} className="text-primary" />
      </button>
      <div className="flex-1">
        <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 block">{duration > 0 ? fmt(duration * progress) + ' / ' + fmt(duration) : '🎤 Голосовое'}</span>
      </div>
    </div>
  );
}

function VideoMessage({ url }: { url: string }) {
  return (
    <div className="rounded-xl overflow-hidden max-w-[220px]">
      <video src={url} controls className="w-full rounded-xl" style={{ maxHeight: '180px' }} />
    </div>
  );
}

type RecordType = 'audio' | 'video';

export default function ChatWindow({ chat, currentUserId, onBack, onBlock, onUnblock }: ChatWindowProps) {
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordType, setRecordType] = useState<RecordType>('audio');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await messagesApi.getMessages(chat.id);
      setMessages(msgs);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [chat.id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    loadMessages();
  }, [chat.id, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Polling every 3s
  useEffect(() => {
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  const send = async () => {
    if (!text.trim() || chat.blocked) return;
    const content = text.trim();
    setText('');
    try {
      await messagesApi.send(chat.id, content);
      await loadMessages();
    } catch (e) {
      console.error(e);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const startRecording = async (type: RecordType) => {
    try {
      const constraints = type === 'video'
        ? { audio: true, video: { facingMode: 'user', width: 480, height: 360 } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (type === 'video' && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      setRecordType(type);
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error('Нет доступа к микрофону/камере', e);
    }
  };

  const stopRecording = () => {
    return new Promise<Blob>((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr) { resolve(new Blob()); return; }
      mr.onstop = () => {
        const mime = recordType === 'video' ? 'video/webm' : 'audio/webm';
        resolve(new Blob(chunksRef.current, { type: mime }));
      };
      mr.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      setRecording(false);
      setVideoPreview(null);
    });
  };

  const cancelRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setVideoPreview(null);
    setRecordSeconds(0);
  };

  const sendRecording = async () => {
    setUploading(true);
    const blob = await stopRecording();
    try {
      const mime = recordType === 'video' ? 'video/webm' : 'audio/webm';
      const b64 = await blobToBase64(blob);
      await messagesApi.uploadMedia(chat.id, b64, mime, recordType, recordSeconds);
      await loadMessages();
    } catch (e) {
      console.error(e);
    }
    setUploading(false);
    setRecordSeconds(0);
  };

  const fmtSecs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const statusLabel = chat.is_group ? 'Группа' :
    'Пользователь';

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border glass-panel">
        <button onClick={onBack} className="md:hidden text-muted-foreground hover:text-foreground mr-1">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-sm font-semibold overflow-hidden">
            {chat.avatar_url
              ? <img src={chat.avatar_url} alt="" className="w-full h-full object-cover" />
              : chat.avatar}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{chat.name}</span>
            {chat.blocked && (
              <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-medium">заблокирован</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">{statusLabel}</span>
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <Icon name="MoreVertical" size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-44 glass-panel border border-border rounded-xl shadow-xl z-50 py-1 animate-scale-in">
              {!chat.blocked ? (
                <button onClick={() => { onBlock(chat.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary/50 transition-colors">
                  <Icon name="Ban" size={15} /> Заблокировать
                </button>
              ) : (
                <button onClick={() => { onUnblock(chat.id); setMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors">
                  <Icon name="ShieldOff" size={15} /> Разблокировать
                </button>
              )}
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors">
                <Icon name="Trash2" size={15} /> Удалить чат
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video preview during recording */}
      {recording && recordType === 'video' && (
        <div className="relative bg-black flex items-center justify-center" style={{ height: 200 }}>
          <video ref={videoRef} muted className="h-full w-full object-cover" />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-mono">{fmtSecs(recordSeconds)}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 gap-2 text-muted-foreground">
            <Icon name="MessageCircle" size={32} />
            <p className="text-sm">Начните общение</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={msg.id} className={`flex ${msg.is_out ? 'justify-end' : 'justify-start'} animate-fade-in`} style={{ animationDelay: `${Math.min(i, 10) * 15}ms` }}>
            <div className={`max-w-[70%] px-3.5 py-2.5 text-sm leading-relaxed ${msg.is_out ? 'msg-bubble-out text-foreground' : 'msg-bubble-in text-foreground'}`}>
              {!msg.is_out && chat.is_group && (
                <p className="text-[11px] text-primary font-medium mb-1">{msg.sender_name}</p>
              )}
              {msg.msg_type === 'text' && <p>{msg.content}</p>}
              {msg.msg_type === 'audio' && msg.media_url && <AudioPlayer url={msg.media_url} />}
              {msg.msg_type === 'video' && msg.media_url && <VideoMessage url={msg.media_url} />}
              <div className={`flex items-center gap-1 mt-1 ${msg.is_out ? 'justify-end' : 'justify-start'}`}>
                <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                {msg.is_out && <Icon name="CheckCheck" size={12} className="text-primary" />}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {chat.blocked ? (
        <div className="px-4 py-4 border-t border-border flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Icon name="Ban" size={16} /> Этот пользователь заблокирован
        </div>
      ) : recording ? (
        /* Recording controls */
        <div className="px-4 py-3 border-t border-border flex items-center gap-3">
          <button onClick={cancelRecording} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors">
            <Icon name="X" size={18} />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-sm text-foreground font-mono">{fmtSecs(recordSeconds)}</span>
            <span className="text-xs text-muted-foreground">{recordType === 'audio' ? 'Голосовое' : 'Видеосообщение'}</span>
          </div>
          <button
            onClick={sendRecording}
            disabled={uploading}
            className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {uploading
              ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              : <Icon name="Send" size={16} />}
          </button>
        </div>
      ) : (
        /* Normal input */
        <div className="px-4 py-3 border-t border-border flex items-end gap-2">
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => startRecording('audio')}
              title="Голосовое сообщение"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            >
              <Icon name="Mic" size={18} />
            </button>
            <button
              onClick={() => startRecording('video')}
              title="Видеосообщение"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-primary transition-colors"
            >
              <Icon name="Video" size={18} />
            </button>
          </div>
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
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${text.trim() ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}
          >
            <Icon name="Send" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
