
import { AppCard } from '@/components/ui/app-card';
import { ListaAgendamentosDia } from '@/components/dashboard/ListaAgendamentosDia';
import { Calendar, CheckSquare } from 'lucide-react';

export function DashboardSidebar() {
  return (
    <AppCard>
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Compromissos & Tarefas
      </h3>
      <ListaAgendamentosDia />
    </AppCard>
  );
}
