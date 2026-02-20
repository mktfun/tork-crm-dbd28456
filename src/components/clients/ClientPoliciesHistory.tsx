import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { Policy } from '@/types';
import { useCompanyNames } from '@/hooks/useCompanyNames';
import { Link } from 'react-router-dom';
import { formatDate } from '@/utils/dateUtils';

interface ClientPoliciesHistoryProps {
  policies: Policy[];
}

export function ClientPoliciesHistory({ policies }: ClientPoliciesHistoryProps) {
  const { getCompanyName, loading: companiesLoading } = useCompanyNames();

  return (
    <AppCard className="p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText size={18} className="text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Histórico de Apólices ({policies.length})
          </h2>
          <p className="text-xs text-muted-foreground">Todos os contratos deste cliente</p>
        </div>
      </div>
      
      {policies.length === 0 ? (
        <div className="text-center py-8">
          <FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma apólice cadastrada ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map(policy => (
            <Link
              to={`/dashboard/policies/${policy.id}`}
              key={policy.id}
              className="block rounded-lg p-4 bg-muted/30 hover:bg-muted/60 border border-border/60 hover:border-border transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Linha 1: ramo + status */}
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground text-sm">
                      {policy.ramos?.nome || policy.type || 'Tipo não informado'}
                    </h4>
                    <Badge variant={policy.status === 'Ativa' ? 'default' : 'secondary'} className="text-[10px] px-1.5">
                      {policy.status}
                    </Badge>
                  </div>

                  {/* Linha 2: metadados */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {policy.policyNumber && <span>Apólice: <span className="font-mono">{policy.policyNumber}</span></span>}
                    {policy.companies?.name && <span>{policy.companies.name}</span>}
                    {policy.expirationDate && <span>Venc. {formatDate(policy.expirationDate)}</span>}
                  </div>
                </div>

                {/* Prêmio */}
                {policy.premiumValue > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Prêmio</p>
                    <p className="font-bold text-emerald-500 text-sm">
                      R$ {policy.premiumValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppCard>
  );
}
