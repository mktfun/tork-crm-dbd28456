
import { AppCard } from '@/components/ui/app-card';
import { History } from 'lucide-react';

export function ClientInteractionsHistory() {
  return (
    <AppCard className="p-6">
      <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
        <History size={20} />
        Histórico de Interações
      </h2>
      <div className="text-center py-8">
        <div className="text-slate-400 mb-4">
          <History size={48} className="mx-auto opacity-50" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">
          Em breve
        </h3>
        <p className="text-slate-300">
          O histórico de interações (ligações, e-mails, etc.) será implementado em uma futura atualização.
        </p>
      </div>
    </AppCard>
  );
}
