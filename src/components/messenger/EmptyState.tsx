import Icon from '@/components/ui/icon';

export default function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
        <Icon name="MessageCircle" size={36} className="text-primary/60" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-lg">Выберите чат</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          Откройте любой чат из списка, чтобы начать общение
        </p>
      </div>
    </div>
  );
}
