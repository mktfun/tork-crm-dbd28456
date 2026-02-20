import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertTriangle, CheckCircle, RotateCcw, Loader2, XCircle, FileText, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSupabaseRenewals } from '@/hooks/useSupabaseRenewals';
import { usePolicies } from '@/hooks/useAppData';
import { Policy } from '@/types';
import { RenewPolicyModal } from '@/components/policies/RenewPolicyModal';
import { ExportRenewalsModal } from '@/components/policies/ExportRenewalsModal';

const renewalStatusConfig: Record<string, { variant: 'secondary' | 'default' | 'destructive'; label: string }> = {
  'Pendente': { variant: 'secondary', label: 'Pendente' },
  'Em Contato': { variant: 'secondary', label: 'Em Contato' },
  'Proposta Enviada': { variant: 'secondary', label: 'Proposta Enviada' },
  'Renovada': { variant: 'default', label: 'Renovada' },
  'Não Renovada': { variant: 'destructive', label: 'Não Renovada' },
};

export default function Renovacoes() {
  usePageTitle('Renovações');

  const { updatePolicy } = usePolicies();
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('60');
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = 12;
  const periodNumber = filterPeriod === 'all' ? -1 : parseInt(filterPeriod);

  const { renewals, totalCount, loading, error, refetch } = useSupabaseRenewals(
    { period: periodNumber, renewalStatus: filterStatus },
    { page: currentPage, pageSize }
  );

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateRenewalStatus = async (policyId: string, newStatus: Policy['renewalStatus']) => {
    await updatePolicy(policyId, { renewalStatus: newStatus });
    refetch();
  };

  const handleRenewClick = (policy: any) => {
    setSelectedPolicy(policy);
    setIsRenewModalOpen(true);
  };

  const handleRenewSuccess = () => {
    setSelectedPolicy(null);
    setIsRenewModalOpen(false);
    refetch();
  };

  const handleFilterChange = (newFilter: string, type: 'status' | 'period') => {
    if (type === 'status') setFilterStatus(newFilter);
    else setFilterPeriod(newFilter);
    setCurrentPage(1);
  };

  const getRenewalStatusBadge = (status: string, diasParaVencer: number) => {
    if (diasParaVencer < 0 && status === 'Pendente') {
      return <Badge variant="destructive">Vencida - Pendente</Badge>;
    }
    const config = renewalStatusConfig[status] || renewalStatusConfig['Pendente'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // KPI calculations from loaded data
  const kpis = [
    {
      label: 'Vencendo em 30d',
      value: renewals.filter((r: any) => r.diasParaVencer >= 0 && r.diasParaVencer <= 30).length,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Vencidas',
      value: renewals.filter((r: any) => r.diasParaVencer < 0 && r.renewalStatus !== 'Renovada').length,
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      label: 'Renovadas',
      value: renewals.filter(r => r.renewalStatus === 'Renovada').length,
      icon: CheckCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Total no período',
      value: totalCount,
      icon: FileText,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  const periodOptions = ['30', '60', '90', '120', 'all'];

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="glass-component p-8 text-center">
            <div className="text-destructive mb-4">
              <AlertTriangle size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Erro ao carregar renovações</h3>
            <p className="text-muted-foreground mb-4">Não foi possível carregar os dados.</p>
            <Button onClick={refetch} variant="outline">Tentar novamente</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Renovações</h1>
          <p className="text-muted-foreground">Gerencie as renovações de apólices próximas ao vencimento</p>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="glass-component p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-component p-4">
          <div className="flex items-center gap-4 flex-wrap justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Period buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Período:</span>
                <div className="flex gap-1">
                  {periodOptions.map(p => (
                    <Button
                      key={p}
                      size="sm"
                      variant={filterPeriod === p ? 'secondary' : 'ghost'}
                      onClick={() => handleFilterChange(p, 'period')}
                      className="text-xs"
                    >
                      {p === 'all' ? 'Todos' : `${p}d`}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status select */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select value={filterStatus} onValueChange={(value) => handleFilterChange(value, 'status')}>
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em Contato">Em Contato</SelectItem>
                    <SelectItem value="Proposta Enviada">Proposta Enviada</SelectItem>
                    <SelectItem value="Renovada">Renovada</SelectItem>
                    <SelectItem value="Não Renovada">Não Renovada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Carregando...</span>
                </div>
              )}
            </div>

            <ExportRenewalsModal disabled={loading || renewals.length === 0} />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="glass-component p-0 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-border animate-pulse">
                <div className="flex gap-4">
                  <div className="h-4 bg-muted rounded w-1/6" />
                  <div className="h-4 bg-muted rounded w-1/6" />
                  <div className="h-4 bg-muted rounded w-1/6" />
                  <div className="h-4 bg-muted rounded w-1/12" />
                  <div className="h-4 bg-muted rounded w-1/12" />
                  <div className="h-4 bg-muted rounded w-1/6" />
                </div>
              </div>
            ))}
          </div>
        ) : renewals.length > 0 ? (
          <div className="glass-component p-0 overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_0.7fr_1fr_0.7fr_1fr_auto] gap-2 px-4 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Cliente</span>
              <span>Nº Apólice</span>
              <span>Seguradora</span>
              <span>Vencimento</span>
              <span>Dias</span>
              <span>Prêmio</span>
              <span>Bônus</span>
              <span>Status</span>
              <span></span>
            </div>

            {/* Table Rows */}
            {renewals.map((policy: any) => {
              const isOverdue = policy.diasParaVencer < 0;
              const isCritical = policy.diasParaVencer >= 0 && policy.diasParaVencer <= 15;

              return (
                <div
                  key={policy.id}
                  className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr_0.7fr_1fr_0.7fr_1fr_auto] gap-2 px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors items-center text-sm"
                >
                  {/* Cliente */}
                  <div>
                    <p className="font-medium text-foreground truncate">{policy.clientName}</p>
                  </div>

                  {/* Nº Apólice */}
                  <div className="text-muted-foreground truncate">{policy.policyNumber || '—'}</div>

                  {/* Seguradora */}
                  <div className="text-muted-foreground truncate">{policy.companies?.name || '—'}</div>

                  {/* Vencimento */}
                  <div className="text-foreground">{formatDate(policy.expirationDate)}</div>

                  {/* Dias */}
                  <div>
                    <span className={cn(
                      "font-semibold text-xs",
                      isOverdue ? "text-destructive" : isCritical ? "text-amber-500" : "text-foreground"
                    )}>
                      {isOverdue ? `${Math.abs(policy.diasParaVencer)}d atr.` : `${policy.diasParaVencer}d`}
                    </span>
                  </div>

                  {/* Prêmio */}
                  <div className="text-foreground font-medium">
                    {policy.premiumValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>

                  {/* Bônus */}
                  <div>
                    <Badge variant="outline" className="text-xs">
                      Cl. {policy.bonus_class || '0'}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div>{getRenewalStatusBadge(policy.renewalStatus || 'Pendente', policy.diasParaVencer)}</div>

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    {policy.renewalStatus !== 'Renovada' && policy.renewalStatus !== 'Não Renovada' && (
                      <Button size="sm" variant="ghost" onClick={() => handleRenewClick(policy)} className="text-xs h-7 px-2">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        Renovar
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateRenewalStatus(policy.id, 'Em Contato')}>
                          Marcar como Em Contato
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateRenewalStatus(policy.id, 'Proposta Enviada')}>
                          Marcar como Proposta Enviada
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateRenewalStatus(policy.id, 'Não Renovada')} className="text-destructive">
                          Marcar como Não Renovada
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
              <span>
                {totalCount === 0 ? '0' : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalCount)}`} de{' '}
                {totalCount} apólices
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs">{currentPage} / {totalPages || 1}</span>
                <Button size="sm" variant="ghost" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-component p-8 text-center">
            <div className="text-muted-foreground mb-4">
              <CheckCircle size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma renovação pendente</h3>
            <p className="text-muted-foreground">
              Todas as apólices estão com renovações em dia ou não há apólices que atendem aos filtros selecionados.
            </p>
          </div>
        )}

        {/* Renewal Modal */}
        <RenewPolicyModal
          policy={selectedPolicy}
          isOpen={isRenewModalOpen}
          onClose={() => setIsRenewModalOpen(false)}
          onSuccess={handleRenewSuccess}
        />
      </div>
    </div>
  );
}
