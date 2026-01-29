import React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { FileText, Calendar, DollarSign, User, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Policy {
  id?: string;
  policy_number?: string;
  numero_apolice?: string;
  status?: string;
  premium_value?: number;
  valor_premio?: number;
  expiration_date?: string;
  vencimento?: string;
  start_date?: string;
  cliente_nome?: string;
  clientes?: { name: string; phone?: string; email?: string };
  ramos?: { nome: string };
  companies?: { name: string };
  ramo?: string;
  seguradora?: string;
  renewal_status?: string;
}

interface PolicyListCardProps {
  policies: Policy[];
  type?: string;
}

/**
 * PolicyListCard: Exibe lista de apólices em cards compactos com design Liquid Glass.
 */
export const PolicyListCard: React.FC<PolicyListCardProps> = ({ policies, type }) => {
  if (!policies || policies.length === 0) {
    return (
      <GlassCard className="p-3">
        <p className="text-sm text-muted-foreground text-center">Nenhuma apólice encontrada</p>
      </GlassCard>
    );
  }

  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    return value.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2 
    });
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    const statusLower = status.toLowerCase();
    
    let colorClass = 'bg-muted text-muted-foreground';
    if (statusLower.includes('ativ') || statusLower.includes('vigente')) {
      colorClass = 'bg-green-500/20 text-green-400';
    } else if (statusLower.includes('pendente') || statusLower.includes('aguardando')) {
      colorClass = 'bg-yellow-500/20 text-yellow-400';
    } else if (statusLower.includes('cancelad') || statusLower.includes('vencid')) {
      colorClass = 'bg-red-500/20 text-red-400';
    }
    
    return (
      <span className={cn("px-2 py-0.5 rounded-full text-xs", colorClass)}>
        {status}
      </span>
    );
  };

  const isExpiring = type === 'expiring_policies';

  return (
    <div className="space-y-2">
      {isExpiring && (
        <div className="flex items-center gap-2 text-xs text-yellow-400 mb-2">
          <Calendar className="h-3 w-3" />
          <span>Apólices próximas do vencimento</span>
        </div>
      )}
      
      {policies.slice(0, 10).map((policy, idx) => {
        const policyNumber = policy.policy_number || policy.numero_apolice || `#${idx + 1}`;
        const clientName = policy.cliente_nome || policy.clientes?.name || 'Cliente não informado';
        const premium = policy.premium_value || policy.valor_premio;
        const expDate = policy.expiration_date || policy.vencimento;
        const ramo = policy.ramos?.nome || policy.ramo;
        const company = policy.companies?.name || policy.seguradora;
        
        return (
          <GlassCard key={policy.id || idx} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                {/* Número e Status */}
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{policyNumber}</span>
                  {getStatusBadge(policy.status)}
                </div>
                
                {/* Cliente */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="truncate">{clientName}</span>
                </div>
                
                {/* Ramo e Seguradora */}
                {(ramo || company) && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {ramo && <span className="truncate">{ramo}</span>}
                    {company && (
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span className="truncate">{company}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Valores */}
              <div className="text-right space-y-1">
                {premium !== undefined && (
                  <div className="flex items-center gap-1 justify-end">
                    <DollarSign className="h-3 w-3 text-green-400" />
                    <span className="text-sm font-medium text-green-400">
                      {formatCurrency(premium)}
                    </span>
                  </div>
                )}
                
                {expDate && (
                  <div className={cn(
                    "flex items-center gap-1 justify-end text-xs",
                    isExpiring ? 'text-yellow-400' : 'text-muted-foreground'
                  )}>
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(expDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        );
      })}
      
      {policies.length > 10 && (
        <p className="text-xs text-muted-foreground text-center pt-1">
          Mostrando 10 de {policies.length} apólices
        </p>
      )}
    </div>
  );
};

export default PolicyListCard;
