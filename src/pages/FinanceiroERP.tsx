import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Loader2,
  BarChart3,
  FileSpreadsheet,
  Settings,
  CalendarClock,
  Landmark,
  Clock,
  Info,
  LineChart,
  GitCompare,
  CheckCircle2
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { CashFlowChart } from '@/components/financeiro/CashFlowChart';
import { DreTable } from '@/components/financeiro/DreTable';
import { ImportTransactionsModal } from '@/components/financeiro/ImportTransactionsModal';
import { ImportReceiptsModal } from '@/components/financeiro/ImportReceiptsModal';
import { ConfiguracoesTab } from '@/components/financeiro/ConfiguracoesTab';
import { DateRangeFilter } from '@/components/financeiro/DateRangeFilter';
import { TransacoesTab } from '@/components/financeiro/TransacoesTab';
import { CaixaTab } from '@/components/financeiro/CaixaTab';
import { TesourariaTab } from '@/components/financeiro/TesourariaTab';
import { ProvisoesTab } from '@/components/financeiro/ProvisoesTab';
import { TransactionDetailsSheet } from '@/components/financeiro/TransactionDetailsSheet';
import { ReconciliationPage } from '@/components/financeiro/reconciliation';
import { ModuloFaturamento } from '@/components/financeiro/dashboard/ModuloFaturamento';
import { ModuloTesouraria } from '@/components/financeiro/dashboard/ModuloTesouraria';
import { ModuloMultiBancos } from '@/components/financeiro/dashboard/ModuloMultiBancos';
import { RecentTransactionsCard } from '@/components/financeiro/dashboard/RecentTransactionsCard';
import { PageDebugger } from '@/components/shared/PageDebugger';
import {
  useFinancialAccountsWithDefaults,
  useCashFlowData,
  useFinancialSummary,
} from '@/hooks/useFinanceiro';
import { usePageTitle } from '@/hooks/usePageTitle';

import { cn } from '@/lib/utils';


// ============ KPI CONFIGURATION ============

function formatCurrency(value: number): string {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(safeValue);
}

function calcTrend(current: number, previous: number): number | undefined {
  if (!previous || previous === 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

// ============ GLASSMORPHISM KPI CARD ============

interface GlassKpiCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  iconGlow: string;
  isLoading?: boolean;
  subtitle?: string;
  tooltip?: string;
  trend?: number;
}

function GlassKpiCard({ title, value, icon: Icon, iconGlow, isLoading, subtitle, tooltip, trend }: GlassKpiCardProps) {
  const cardContent = (
    <Card className="bg-black/40 backdrop-blur-md border border-white/10 shadow-xl shadow-black/20 hover:border-white/20 transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg bg-white/5', iconGlow)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">{title}</p>
              {tooltip && (
                <Info className="w-3.5 h-3.5 text-muted-foreground/50" />
              )}
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <>
                <p className="text-xl font-bold text-foreground">
                  {formatCurrency(value)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {subtitle && (
                    <span className="text-xs text-muted-foreground">{subtitle}</span>
                  )}
                  {trend !== undefined && trend !== 0 && (
                    <span className={cn(
                      'text-xs font-medium flex items-center gap-0.5',
                      trend > 0 ? 'text-emerald-400' : 'text-rose-400'
                    )}>
                      {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {trend > 0 ? '+' : ''}{trend}%
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
}

// ============ KPI SECTION ============

interface KpiSectionProps {
  startDate: string;
  endDate: string;
}

function KpiSection({ startDate, endDate }: KpiSectionProps) {
  const { data: summary, isLoading } = useFinancialSummary(startDate, endDate);

  const current = summary?.current;
  const previous = summary?.previous;

  // Debug logging
  if (!isLoading && current) {
    if (current.pendingIncome === 0) {
      console.warn('[KPI] pendingIncome is 0 — verify get_financial_summary RPC');
    }
    if (current.operationalPendingIncome === 0) {
      console.warn('[KPI] operationalPendingIncome is 0 — verify get_financial_summary RPC');
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <GlassKpiCard
        title="Recebido no Mês"
        value={current?.totalIncome ?? 0}
        icon={TrendingUp}
        iconGlow="text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]"
        isLoading={isLoading}
        trend={calcTrend(current?.totalIncome ?? 0, previous?.totalIncome ?? 0)}
        tooltip="Receitas confirmadas no período selecionado."
      />
      <GlassKpiCard
        title="Despesas do Mês"
        value={current?.totalExpense ?? 0}
        icon={TrendingDown}
        iconGlow="text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]"
        isLoading={isLoading}
        trend={calcTrend(current?.totalExpense ?? 0, previous?.totalExpense ?? 0)}
        tooltip="Despesas confirmadas no período selecionado."
      />
      <GlassKpiCard
        title="Vencendo este Mês"
        value={current?.pendingIncome ?? 0}
        icon={CalendarClock}
        iconGlow="text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
        isLoading={isLoading}
        tooltip="Receitas pendentes com vencimento no período filtrado."
      />
      <GlassKpiCard
        title="Total Geral a Receber"
        value={current?.operationalPendingIncome ?? 0}
        icon={Clock}
        iconGlow="text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.4)]"
        isLoading={isLoading}
        tooltip="Total operacional a receber (vencidos + próximos 30 dias)."
      />
    </div>
  );
}

// ============ VISÃO GERAL ============

interface VisaoGeralProps {
  dateRange: DateRange | undefined;
  onNavigate: (path: string) => void;
  onTabChange: (tab: string) => void;
}

function VisaoGeral({ dateRange, onNavigate, onTabChange }: VisaoGeralProps) {
  const { isLoading: accountsLoading, isEnsuring } = useFinancialAccountsWithDefaults();

  const chartPeriod = useMemo(() => {
    const from = dateRange?.from || subMonths(new Date(), 1);
    const to = dateRange?.to || new Date();
    return {
      startDate: format(startOfDay(from), 'yyyy-MM-dd'),
      endDate: format(endOfDay(to), 'yyyy-MM-dd')
    };
  }, [dateRange]);

  const { data: cashFlowData = [], isLoading: cashFlowLoading } = useCashFlowData(
    chartPeriod.startDate,
    chartPeriod.endDate,
    'day'
  );

  if (accountsLoading || isEnsuring) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">
          {isEnsuring ? 'Configurando contas...' : 'Carregando...'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gráfico de Fluxo de Caixa - PRIMEIRO */}
      <CashFlowChart
        data={cashFlowData}
        isLoading={cashFlowLoading}
        granularity="day"
      />

      {/* Faturamento & Vendas | Saldos Bancários */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModuloFaturamento
          onClick={() => onTabChange('transacoes')}
          dateRange={dateRange}
        />
        <ModuloMultiBancos onClick={() => onTabChange('caixa')} />
      </div>

      {/* Tesouraria & Contas - Largura Total */}
      <ModuloTesouraria onClick={() => onTabChange('tesouraria')} />
    </div>
  );
}

// ============ DRE TAB ============

function DreTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">DRE / Relatórios</h2>
        <p className="text-sm text-muted-foreground">
          Demonstrativo de Resultado do Exercício - visão consolidada de receitas e despesas
        </p>
      </div>
      <DreTable />
    </div>
  );
}



// ============ MAIN COMPONENT ============

export default function FinanceiroERP() {
  usePageTitle('Financeiro');
  const [searchParams, setSearchParams] = useSearchParams();

  // Estado global de filtro de datas
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  // Estado para controle da aba e detalhes
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [detailsTransactionId, setDetailsTransactionId] = useState<string | null>(null);
  const [isLegacyLookup, setIsLegacyLookup] = useState(false);
  const navigate = useNavigate();

  // Datas normalizadas para queries
  const { startDate, endDate } = useMemo(() => {
    const from = dateRange?.from || startOfMonth(new Date());
    const to = dateRange?.to || endOfMonth(new Date());
    return {
      startDate: format(startOfDay(from), 'yyyy-MM-dd'),
      endDate: format(endOfDay(to), 'yyyy-MM-dd')
    };
  }, [dateRange]);

   // Handlers
  const handleViewTransactionDetails = (id: string) => {
    setDetailsTransactionId(id);
    setIsLegacyLookup(false);
  };

  const handleCloseDetails = () => {
    setDetailsTransactionId(null);
    setIsLegacyLookup(false);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2">
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
        <ImportReceiptsModal />
        <ImportTransactionsModal />
      </div>

      {/* KPIs - powered by get_financial_summary */}
      <KpiSection startDate={startDate} endDate={endDate} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 backdrop-blur-md border border-border/50 p-1 rounded-xl">
          <TabsTrigger value="visao-geral" className="gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
            <BarChart3 className="w-4 h-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="caixa" className="gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
            <Landmark className="w-4 h-4" />
            Bancos
          </TabsTrigger>
          <TabsTrigger value="tesouraria" className="gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
            <Wallet className="w-4 h-4" />
            Tesouraria
          </TabsTrigger>
          <TabsTrigger value="transacoes" className="gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
            <Wallet className="w-4 h-4" />
            Transações
          </TabsTrigger>
          <TabsTrigger value="provisoes" className="gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
            <LineChart className="w-4 h-4" />
            Provisões
          </TabsTrigger>
          <TabsTrigger value="dre" className="gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
            <FileSpreadsheet className="w-4 h-4" />
            DRE
          </TabsTrigger>
          <TabsTrigger value="conciliacao" className="gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
            <GitCompare className="w-4 h-4" />
            Conciliação
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground">
            <Settings className="w-4 h-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral">
          <VisaoGeral
            dateRange={dateRange}
            onNavigate={(path) => navigate(path)}
            onTabChange={setActiveTab}
          />
          <div className="mt-6">
            <RecentTransactionsCard onViewDetails={handleViewTransactionDetails} />
          </div>
        </TabsContent>

        <TabsContent value="caixa">
          <CaixaTab dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="tesouraria">
          <TesourariaTab dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="transacoes">
          <TransacoesTab dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="provisoes">
          <ProvisoesTab dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="dre">
          <DreTab />
        </TabsContent>

        <TabsContent value="conciliacao">
          <ReconciliationPage />
        </TabsContent>

        <TabsContent value="config">
          <ConfiguracoesTab />
        </TabsContent>
      </Tabs>

      {/* Deep Link Details Sheet */}
      <TransactionDetailsSheet
        transactionId={detailsTransactionId}
        isLegacyId={isLegacyLookup}
        open={!!detailsTransactionId}
        onClose={handleCloseDetails}
      />

      {/* Protocolo de Sanidade - Debug Mode */}
      <PageDebugger context={activeTab} />
    </div>
  );
}
