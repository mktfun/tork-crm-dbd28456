import { AppCard } from '@/components/ui/app-card';
import { ListaAgendamentosDia } from '@/components/dashboard/ListaAgendamentosDia';
import { Calendar } from 'lucide-react';

export function DashboardSidebar() {
  return (
    <AppCard className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-foreground/10">
          <Calendar className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Compromissos & Tarefas</h3>
          <p className="text-xs text-muted-foreground">Próximas 24h</p>
        </div>
      </div>
      <ListaAgendamentosDia />
    </AppCard>
  );
}
