import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { Chat } from './data';

interface CreateGroupProps {
  contacts: Chat[];
  onClose: () => void;
  onCreate: (name: string, members: number[]) => void;
}

export default function CreateGroup({ contacts, onClose, onCreate }: CreateGroupProps) {
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  const personalChats = contacts.filter((c) => !c.isGroup && !c.blocked);

  const toggle = (id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleCreate = () => {
    if (!groupName.trim() || selected.length === 0) return;
    onCreate(groupName.trim(), selected);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">
            {step === 1 ? 'Выберите участников' : 'Название группы'}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        {step === 1 ? (
          <div className="p-4">
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {personalChats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left
                    ${selected.includes(c.id) ? 'bg-primary/15 border border-primary/30' : 'hover:bg-secondary'}`}
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-sm font-medium">
                    {c.avatar}
                  </div>
                  <span className="flex-1 text-sm text-foreground">{c.name}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                    ${selected.includes(c.id) ? 'border-primary bg-primary' : 'border-border'}`}>
                    {selected.includes(c.id) && <Icon name="Check" size={10} className="text-white" />}
                  </div>
                </button>
              ))}
            </div>
            {selected.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">Выбрано: {selected.length}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="flex-1 bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-secondary/70 transition-colors">
                Отмена
              </button>
              <button
                onClick={() => selected.length > 0 && setStep(2)}
                disabled={selected.length === 0}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors
                  ${selected.length > 0 ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}
              >
                Далее
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl mx-auto mb-4">
              👥
            </div>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Название группы"
              autoFocus
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {selected.length} участника будут добавлены в группу
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setStep(1)} className="flex-1 bg-secondary text-foreground rounded-xl py-2.5 text-sm font-medium hover:bg-secondary/70 transition-colors">
                Назад
              </button>
              <button
                onClick={handleCreate}
                disabled={!groupName.trim()}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors
                  ${groupName.trim() ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}
              >
                Создать
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
