import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Car, Heart, Home, Briefcase, Plane, Smartphone, Shield, FileText } from 'lucide-react';

export interface PortalRequestRow {
  id: string;
  client_id: string;
  brokerage_user_id: string;
  request_type: string;
  insurance_type: string;
  qar_report: string | null;
  custom_fields: any;
  status: string;
  deal_id: string | null;
  policy_id: string | null;
  created_at: string;
  clientes?: { name: string; phone?: string; email?: string } | null;
}

const ramoIcons: Record<string, any> = {
  auto: Car,
  saude: Heart,
  residencial: Home,
  empresarial: Briefcase,
  viagem: Plane,
  smartphone: Smartphone,
  vida: Shield,
};

const ramoLabels: Record<string, string> = {
  auto: 'Auto',
  saude: 'Saúde',
  residencial: 'Residencial',
  empresarial: 'Empresarial',
  viagem: 'Viagem',
  smartphone: 'Smartphone',
  vida: 'Vida',
};

const typeLabels: Record<string, string> = {
  cotacao: 'Cotação',
  endosso: 'Endosso',
  sinistro: 'Sinistro',
  renovacao: 'Renovação',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  em_atendimento: { label: 'Em Atendimento', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  concluido: { label: 'Concluído', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

interface RequestsListProps {
  requests: PortalRequestRow[];
  isLoading: boolean;
  onSelect: (request: PortalRequestRow) => void;
}

export function RequestsList({ requests, isLoading, onSelect }: RequestsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Nenhuma solicitação encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => {
        const RamoIcon = ramoIcons[req.insurance_type] || Shield;
        const status = statusConfig[req.status] || statusConfig.pendente;

        return (
          <button
            key={req.id}
            onClick={() => onSelect(req)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-lg transition-all text-left',
              'bg-card/60 border border-border/40 hover:bg-card/90 hover:border-border/70',
              'focus:outline-none focus:ring-1 focus:ring-primary/40'
            )}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center">
              <RamoIcon className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-foreground truncate">
                  {req.clientes?.name || 'Cliente desconhecido'}
                </span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {typeLabels[req.request_type] || req.request_type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{ramoLabels[req.insurance_type] || req.insurance_type}</span>
                <span>·</span>
                <span>{format(new Date(req.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}</span>
              </div>
            </div>

            <Badge variant="outline" className={cn('text-xs shrink-0', status.className)}>
              {status.label}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
