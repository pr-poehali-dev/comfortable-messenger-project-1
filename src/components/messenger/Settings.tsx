import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ value, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-all relative shrink-0
        ${value ? 'bg-primary' : 'bg-secondary border border-border'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all
        ${value ? 'left-[22px]' : 'left-0.5'}`}
      />
    </button>
  );
}

export default function Settings() {
  const [notifSound, setNotifSound] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifMsg, setNotifMsg] = useState(true);
  const [notifGroup, setNotifGroup] = useState(false);
  const [readReceipts, setReadReceipts] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'system'>('dark');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  const sections = [
    {
      title: 'Уведомления',
      icon: 'Bell',
      items: [
        { label: 'Звук уведомлений', desc: 'Звук при получении сообщений', value: notifSound, onChange: setNotifSound },
        { label: 'Push-уведомления', desc: 'Уведомления вне приложения', value: notifPush, onChange: setNotifPush },
        { label: 'Сообщения', desc: 'Уведомления о личных сообщениях', value: notifMsg, onChange: setNotifMsg },
        { label: 'Группы', desc: 'Уведомления из групповых чатов', value: notifGroup, onChange: setNotifGroup },
      ],
    },
    {
      title: 'Конфиденциальность',
      icon: 'Shield',
      items: [
        { label: 'Подтверждение прочтения', desc: 'Показывать, что сообщение прочитано', value: readReceipts, onChange: setReadReceipts },
        { label: 'Статус "В сети"', desc: 'Отображать время последнего визита', value: onlineStatus, onChange: setOnlineStatus },
      ],
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-semibold text-base text-foreground">Настройки</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sections.map((section, si) => (
          <div key={si} className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: `${si * 80}ms` }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Icon name={section.icon} size={16} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">{section.title}</span>
            </div>
            {section.items.map((item, ii) => (
              <div key={ii} className={`flex items-center justify-between px-4 py-3 ${ii < section.items.length - 1 ? 'border-b border-border' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <Toggle value={item.value} onChange={item.onChange} />
              </div>
            ))}
          </div>
        ))}

        {/* Appearance */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Icon name="Palette" size={16} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">Внешний вид</span>
          </div>
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground mb-2">Тема</p>
            <div className="flex gap-2">
              {(['dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                    ${theme === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                >
                  {t === 'dark' ? '🌙 Тёмная' : '⚙️ Системная'}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-foreground mb-2">Размер шрифта</p>
            <div className="flex gap-2">
              {(['small', 'medium', 'large'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFontSize(f)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all
                    ${fontSize === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                >
                  {f === 'small' ? 'A' : f === 'medium' ? 'A' : 'A'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Icon name="AlertTriangle" size={16} className="text-destructive" />
            <span className="text-sm font-semibold text-foreground">Аккаунт</span>
          </div>
          <button className="w-full flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-secondary/40 transition-colors">
            <Icon name="LogOut" size={16} className="text-muted-foreground" />
            <span className="text-sm text-foreground">Выйти из аккаунта</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 transition-colors">
            <Icon name="Trash2" size={16} className="text-destructive" />
            <span className="text-sm text-destructive">Удалить аккаунт</span>
          </button>
        </div>
      </div>
    </div>
  );
}
