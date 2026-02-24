import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCompanyNames } from '@/hooks/useCompanyNames';
import { useClients } from '@/hooks/useAppData';
import { PolicyFormModal } from '@/components/policies/PolicyFormModal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, FileText, DollarSign, TrendingUp, AlertCircle, Download, Sparkles, SlidersHorizontal, X, Building2, Clock } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { formatDate, parseLocalDate } from '@/utils/dateUtils';
import { PolicyFilters } from '@/hooks/useFilteredPolicies';
import { Badge } from '@/components/ui/badge';
import { useSupabaseProducers } from '@/hooks/useSupabaseProducers';
import { AutoRenewalIndicator } from '@/components/policies/AutoRenewalIndicator';
import { useSupabasePoliciesPaginated } from '@/hooks/useSupabasePoliciesPaginated';
import { useSupabaseCompanies } from '@/hooks/useSupabaseCompanies';
import { usePolicyKPIs } from '@/hooks/usePolicyKPIs';
import { KpiCard } from '@/components/policies/KpiCard';
import { exportPoliciesCSV } from '@/utils/exportPoliciesCSV';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { ExportPoliciesModal } from '@/components/policies/ExportPoliciesModal';
import { ImportPoliciesModal } from '@/components/policies/ImportPoliciesModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSupabaseRamos } from '@/hooks/useSupabaseRamos';
import { AppCard } from '@/components/ui/app-card';

export default function Policies() {
  const { clients } = useClients();
  const { producers } = useSupabaseProducers();
  const { companies } = useSupabaseCompanies();
  const { data: ramos = [] } = useSupabaseRamos();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isNewPolicyModalOpen, setIsNewPolicyModalOpen] = useState(false);
  const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  // Estado de paginação e filtros
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState<PolicyFilters>({
    searchTerm: '',
    status: 'todos',
    insuranceCompany: 'todas',
    period: 'todos',
    producerId: 'todos',
    ramo: 'todos',
    customStart: null,
    customEnd: null,
  });

  // Usar o novo hook de paginação server-side
  const {
    policies: filteredPolicies,
    totalCount,
    totalPages,
    isLoading
  } = useSupabasePoliciesPaginated({
    page,
    limit,
    filters
  });

  // Buscar KPIs dinâmicos
  const { kpis, isLoading: kpisLoading } = usePolicyKPIs(filters);

  // Pegar seguradoras únicas dos dados carregados
  const uniqueInsuranceCompanies = useMemo(() => {
    const companyIds = new Set(companies.map(c => c.id));
    return Array.from(companyIds);
  }, [companies]);

  // Resetar para página 1 quando os filtros ou limite mudarem
  useEffect(() => {
    setPage(1);
  }, [filters, limit]);

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const seg = searchParams.get('seguradora');
    const ramo = searchParams.get('ramo');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const q = searchParams.get('q');
    setFilters(prev => ({
      ...prev,
      insuranceCompany: seg || prev.insuranceCompany,
      ramo: ramo || prev.ramo,
      period: start && end ? 'custom' : prev.period,
      customStart: start || prev.customStart || null,
      customEnd: end || prev.customEnd || null,
      searchTerm: q || prev.searchTerm,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      status: 'todos',
      insuranceCompany: 'todas',
      period: 'todos',
      producerId: 'todos',
      ramo: 'todos',
      customStart: null,
      customEnd: null,
    });
  };

  // Contagem de filtros avançados ativos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.insuranceCompany !== 'todas') count++;
    if (filters.producerId !== 'todos') count++;
    if (filters.ramo !== 'todos') count++;
    if (filters.period !== 'todos') count++;
    if (filters.customStart) count++;
    if (filters.customEnd) count++;
    return count;
  }, [filters]);

  const handleCloseNewPolicyModal = () => {
    setIsNewPolicyModalOpen(false);
  };

  const handleExportCSV = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      setIsExporting(true);
      await exportPoliciesCSV(filters, user);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao exportar relatório');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusVariant = (status: string): string => {
    switch (status) {
      case 'Ativa': return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'Orçamento': return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      case 'Aguardando Apólice': return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      case 'Cancelada': return 'bg-destructive/15 text-destructive border border-destructive/30';
      case 'Renovada': return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      default: return 'bg-muted text-muted-foreground border border-border';
    }
  };

  // Componente de Filtros Avançados (reutilizável)
  const AdvancedFiltersContent = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-foreground">Filtros Avançados</h4>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4 mr-1" />
            Limpar ({activeFilterCount})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seguradora */}
        <div>
          <Label htmlFor="insuranceCompany" className="text-muted-foreground text-sm">Seguradora</Label>
          <Select
            value={filters.insuranceCompany}
            onValueChange={(value) => setFilters({ ...filters, insuranceCompany: value })}
          >
            <SelectTrigger className="bg-card border-border text-foreground mt-1">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ramo */}
        <div>
          <Label htmlFor="ramo" className="text-muted-foreground text-sm">Ramo</Label>
          <Select
            value={filters.ramo}
            onValueChange={(value) => setFilters({ ...filters, ramo: value })}
          >
            <SelectTrigger className="bg-card border-border text-foreground mt-1">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {ramos.map(ramo => (
                <SelectItem key={ramo.id} value={ramo.id}>{ramo.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Produtor */}
        <div>
          <Label htmlFor="producer" className="text-muted-foreground text-sm">Produtor</Label>
          <Select
            value={filters.producerId}
            onValueChange={(value) => setFilters({ ...filters, producerId: value })}
          >
            <SelectTrigger className="bg-card border-border text-foreground mt-1">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {producers.map(producer => (
                <SelectItem key={producer.id} value={producer.id}>{producer.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Período de Vencimento */}
        <div>
          <Label htmlFor="period" className="text-muted-foreground text-sm">Vencimento</Label>
          <Select
            value={filters.period}
            onValueChange={(value) => setFilters({
              ...filters,
              period: value,
              customStart: value !== 'custom' ? null : filters.customStart,
              customEnd: value !== 'custom' ? null : filters.customEnd
            })}
          >
            <SelectTrigger className="bg-card border-border text-foreground mt-1">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="current-month">Mês Corrente</SelectItem>
              <SelectItem value="next-30-days">Próximos 30 dias</SelectItem>
              <SelectItem value="next-90-days">Próximos 90 dias</SelectItem>
              <SelectItem value="expired">Expiradas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Início */}
        <div>
          <Label htmlFor="customStart" className="text-muted-foreground text-sm">Vencimento (Início)</Label>
          <Input
            type="date"
            id="customStart"
            className="bg-card border-border text-foreground mt-1"
            value={filters.customStart || ''}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              customStart: e.target.value || null,
              period: e.target.value || prev.customEnd ? 'custom' : 'todos'
            }))}
          />
        </div>

        {/* Data Fim */}
        <div>
          <Label htmlFor="customEnd" className="text-muted-foreground text-sm">Vencimento (Fim)</Label>
          <Input
            type="date"
            id="customEnd"
            className="bg-card border-border text-foreground mt-1"
            value={filters.customEnd || ''}
            onChange={(e) => setFilters(prev => ({
              ...prev,
              customEnd: e.target.value || null,
              period: e.target.value || prev.customStart ? 'custom' : 'todos'
            }))}
          />
        </div>

        {/* Itens por página */}
        <div className="md:col-span-2">
          <Label htmlFor="limit" className="text-muted-foreground text-sm">Itens por página</Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => setLimit(Number(value))}
          >
            <SelectTrigger className="bg-card border-border text-foreground mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Seção de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Apólices Ativas"
          value={kpis.totalActive}
          icon={FileText}
          isLoading={kpisLoading}
        />
        <KpiCard
          title="Prêmio Total"
          value={kpis.totalPremium.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
          icon={DollarSign}
          isLoading={kpisLoading}
        />
        <KpiCard
          title="Comissão Estimada"
          value={kpis.estimatedCommission.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}
          icon={TrendingUp}
          subtitle="Anual"
          isLoading={kpisLoading}
        />
        <KpiCard
          title="Vencendo em 30 dias"
          value={kpis.expiringSoon}
          icon={AlertCircle}
          variant={kpis.expiringSoon > 0 ? 'warning' : 'default'}
          isLoading={kpisLoading}
        />
      </div>

      {/* Header e Filtros */}
      <div className="flex flex-col gap-4">
        {/* Linha 1: Título e Ações */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="text-2xl font-bold text-foreground">
            Apólices <span className="text-sm text-muted-foreground">({totalCount} total)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Grupo de Export - menor destaque */}
            <div className="flex gap-1">
              <Button
                onClick={handleExportCSV}
                disabled={isExporting}
                variant="outline"
                size="sm"
                className="bg-card bg-muted/80 text-foreground border-border"
              >
                <Download className="w-4 h-4" />
                <span className="hidden lg:inline ml-2">{isExporting ? 'Exportando...' : 'CSV'}</span>
              </Button>
              <ExportPoliciesModal filters={filters} disabled={isLoading} />
            </div>

            {/* Separador visual */}
            <div className="h-6 w-px bg-border hidden md:block" />

            {/* Ações Principais */}
            <Button
              onClick={() => setIsAIImportModalOpen(true)}
              variant="outline"
              className="bg-muted/80 border-border text-foreground hover:bg-muted hover:text-foreground gap-2"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              Importar via IA
            </Button>

            <Button
              onClick={() => setIsNewPolicyModalOpen(true)}
              variant="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Apólice
            </Button>
          </div>
        </div>

        {/* Linha 2: Busca + Status + Filtros Avançados */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Busca */}
          <div className="flex-1 max-w-md">
            <Input
              type="search"
              placeholder="Buscar por apólice ou cliente..."
              className="bg-card border-border text-foreground w-full"
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
            />
          </div>

          {/* Status - visível por padrão */}
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger className="bg-card border-border text-foreground w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="Orçamento">Orçamento</SelectItem>
              <SelectItem value="Aguardando Apólice">Aguardando Apólice</SelectItem>
              <SelectItem value="Ativa">Ativa</SelectItem>
              <SelectItem value="Cancelada">Cancelada</SelectItem>
              <SelectItem value="Renovada">Renovada</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtros Avançados - Popover no Desktop, Drawer no Mobile */}
          {isMobile ? (
            <Drawer open={isAdvancedFiltersOpen} onOpenChange={setIsAdvancedFiltersOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="relative bg-card border-border text-foreground bg-muted/80">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-purple-500 text-foreground text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-popover border-border">
                <DrawerHeader>
                  <DrawerTitle className="text-foreground">Filtros Avançados</DrawerTitle>
                </DrawerHeader>
                <AdvancedFiltersContent />
                <div className="p-4 pt-0">
                  <DrawerClose asChild>
                    <Button className="w-full" variant="default">
                      Aplicar Filtros
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={isAdvancedFiltersOpen} onOpenChange={setIsAdvancedFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative bg-card border-border text-foreground bg-muted/80">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-purple-500 text-foreground text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px] bg-popover border-border p-0" align="end">
                <AdvancedFiltersContent />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Lista de Apólices */}
      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-lg p-6 animate-pulse"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-5 bg-muted rounded w-48" />
                    <div className="h-5 bg-muted rounded w-16" />
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="space-y-1">
                        <div className="h-3 bg-muted rounded w-16" />
                        <div className="h-4 bg-muted/70 rounded w-24" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="space-y-1 text-right">
                    <div className="h-3 bg-muted rounded w-12 ml-auto" />
                    <div className="h-5 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-16 ml-auto" />
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="h-3 bg-muted rounded w-16 ml-auto" />
                    <div className="h-4 bg-muted rounded w-20" />
                    <div className="h-3 bg-muted rounded w-12 ml-auto" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : filteredPolicies.map(policy => {
          const client = clients.find(c => c.id === policy.clientId);
          const producer = producers.find(p => p.id === policy.producerId);
          const daysRemaining = differenceInDays(parseLocalDate(policy.expirationDate), new Date());
          const isExpiringSoon = daysRemaining <= 30 && daysRemaining >= 0;
          const policyRamos = (policy as typeof policy & { ramos?: { nome: string } }).ramos;

          return (
            <AppCard
              key={policy.id}
              className="p-5 cursor-pointer hover:scale-[1.01]"
              onClick={() => navigate(`/dashboard/policies/${policy.id}`)}
            >
              {/* ─── Linha 1: Identificação ─── */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                <div className="space-y-1 min-w-0 flex-1">
                  {/* Breadcrumb: ramo · seguradora */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium">
                      {policyRamos?.nome || policy.type || 'Seguro'}
                    </Badge>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {policy.companies?.name || 'Seguradora'}
                    </span>
                    {policy.insuredAsset && (
                      <>
                        <span>·</span>
                        <span className="truncate max-w-[200px]">{policy.insuredAsset}</span>
                      </>
                    )}
                  </div>

                  {/* Nome do cliente — destaque principal */}
                  <h3 className="text-lg font-semibold text-foreground leading-tight">
                    {client?.name || 'Cliente não encontrado'}
                  </h3>

                  {/* Número da apólice */}
                  <p className="text-xs text-muted-foreground font-mono">
                    {policy.policyNumber || `ORÇ-${policy.id.slice(-8)}`}
                  </p>
                </div>

                {/* Badges de status — lado direito */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <Badge className={cn("font-medium text-xs", getStatusVariant(policy.status))}>
                    {policy.status}
                  </Badge>
                  <AutoRenewalIndicator
                    automaticRenewal={policy.automaticRenewal}
                    expirationDate={policy.expirationDate}
                    status={policy.status}
                  />
                  {isExpiringSoon && policy.status === 'Ativa' && (
                    <Badge className="bg-destructive/10 text-destructive border border-destructive/30 text-xs">
                      {daysRemaining}d p/ vencer
                    </Badge>
                  )}
                </div>
              </div>

              {/* ─── Linha 2: Metadados + Financeiro ─── */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-3 border-t border-border">
                {/* Lado esquerdo: campos de info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm flex-1">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Cliente</p>
                    <p className="text-foreground font-medium truncate">
                      {client?.name?.split(' ').slice(0, 2).join(' ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Seguradora</p>
                    <p className="text-foreground truncate">
                      {policy.companies?.name?.split(' ')[0] || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ramo</p>
                    <p className="text-foreground">
                      {policyRamos?.nome || policy.type || '—'}
                    </p>
                  </div>
                  {producer && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Produtor</p>
                      <p className="text-foreground truncate">{producer.name}</p>
                    </div>
                  )}
                </div>

                {/* Lado direito: bloco financeiro + datas */}
                <div className="flex items-end gap-5 flex-shrink-0">
                  {/* Prêmio */}
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Prêmio</p>
                    <p className="text-foreground font-bold text-lg leading-tight">
                      {policy.premiumValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {policy.commissionRate}% comissão
                    </p>
                  </div>

                  {/* Vencimento */}
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Vencimento</p>
                    <p className={`font-medium leading-tight ${isExpiringSoon ? 'text-amber-500' : daysRemaining < 0 ? 'text-destructive' : 'text-foreground'}`}>
                      {formatDate(policy.expirationDate)}
                    </p>
                    <p className={`text-xs flex items-center justify-end gap-1 ${
                      daysRemaining < 0 ? 'text-destructive' : daysRemaining <= 30 ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {daysRemaining < 0
                        ? `${Math.abs(daysRemaining)}d vencida`
                        : `${daysRemaining}d restantes`}
                    </p>
                  </div>
                </div>
              </div>
            </AppCard>
          );
        })}
        {!isLoading && filteredPolicies.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma apólice encontrada com os filtros selecionados.
          </div>
        )}
      </div>

      {/* Controles de Paginação */}
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={(newPage) => setPage(newPage)}
        isLoading={isLoading}
      />

      {/* Modais */}


      {/* Modal Nova Apólice */}
      {isNewPolicyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="bg-background w-full sm:max-w-2xl sm:rounded-[2rem] rounded-t-[2rem] rounded-b-none border-0 shadow-[0_-20px_60px_rgba(0,0,0,0.2)] max-h-[92vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-muted/30 flex-shrink-0">
              <h2 className="text-xl font-bold text-foreground tracking-tight">Nova Apólice</h2>
              <Button
                onClick={handleCloseNewPolicyModal}
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PolicyFormModal
                onClose={handleCloseNewPolicyModal}
                onPolicyAdded={() => { }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Importação via IA */}
      <ImportPoliciesModal
        open={isAIImportModalOpen}
        onOpenChange={setIsAIImportModalOpen}
      />

    </div>
  );
}
