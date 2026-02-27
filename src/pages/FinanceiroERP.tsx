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
  LineChart,
  GitCompare,
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
import { ReconciliationPage } from '@/features/finance/components/reconciliation';
import { MetasCard } from '@/components/financeiro/faturamento/MetasCard';
import { ModuloTesouraria } from '@/components/financeiro/dashboard/ModuloTesouraria';
import { ModuloMultiBancos } from '@/components/financeiro/dashboard/ModuloMultiBancos';
import { RecentTransactionsCard } from '@/components/financeiro/dashboard/RecentTransactionsCard';
import { GlassKpiCard } from '@/components/financeiro/shared/GlassKpiCard';
import { PageDebugger } from '@/components/shared/PageDebugger';
import {
  useFinancialAccountsWithDefaults,
  useCashFlowData,
  useFinancialSummary,
} from '@/hooks/useFinanceiro';
import { usePageTitle } from '@/hooks/usePageTitle';

import { cn } from '@/lib/utils';

// ============ HELPERS ============

function formatCurrency(value: number): string {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(safeValue);
}

function calcTrend(current: number, previous: number): { value: number; label: string } | null {
  if (!previous || previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return null;
  return { value: pct, label: 'vs anterior' };
}

// ============ KPI SECTION ============

interface KpiSectionProps {
  startDate: string;
  endDate: string;
}

function KpiSection({ startDate, endDate }: KpiSectionProps) {
  const { data: summary, isLoading } = useFinancialSummary(startDate, endDate);
  const navigate = useNavigate();

  const current = summary?.current;
  const previous = summary?.previous;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <GlassKpiCard
        title="Recebido no Mês"
        value={formatCurrency(current?.totalIncome ?? 0)}
        icon={TrendingUp}
        iconClassName="text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]"
        isLoading={isLoading}
        trend={calcTrend(current?.totalIncome ?? 0, previous?.totalIncome ?? 0)}
        onClick={() => navigate('/dashboard/financeiro?tab=transacoes&type=revenue')}
      />
      <GlassKpiCard
        title="Despesas do Mês"
        value={formatCurrency(current?.totalExpense ?? 0)}
        icon={TrendingDown}
        iconClassName="text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]"
        isLoading={isLoading}
        trend={calcTrend(current?.totalExpense ?? 0, previous?.totalExpense ?? 0)}
        onClick={() => navigate('/dashboard/financeiro?tab=transacoes&type=expense')}
      />
      <GlassKpiCard
        title="Vencendo este Mês"
        value={formatCurrency(current?.pendingIncome ?? 0)}
        icon={CalendarClock}
        iconClassName="text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
        isLoading={isLoading}
        onClick={() => navigate('/dashboard/financeiro?tab=tesouraria&status=pending')}
      />
      <GlassKpiCard
        title="Total Geral a Receber"
        value={formatCurrency(current?.operationalPendingIncome ?? 0)}
        icon={Clock}
        iconClassName="text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.4)]"
        isLoading={isLoading}
        onClick={() => navigate('/dashboard/financeiro?tab=tesouraria&view=operational')}
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
      <CashFlowChart data={cashFlowData} isLoading={cashFlowLoading} granularity="day" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div onClick={() => onTabChange('transacoes')} className="cursor-pointer transition-transform hover:scale-[1.01]">
          <MetasCard />
        </div>
        <ModuloMultiBancos onClick={() => onTabChange('caixa')} />
      </div>
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

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const [activeTab, setActiveTab] = useState('visao-geral');
  const [detailsTransactionId, setDetailsTransactionId] = useState<string | null>(null);
  const [isLegacyLookup, setIsLegacyLookup] = useState(false);
  const navigate = useNavigate();

  const { startDate, endDate } = useMemo(() => {
    const from = dateRange?.from || startOfMonth(new Date());
    const to = dateRange?.to || endOfMonth(new Date());
    return {
      startDate: format(startOfDay(from), 'yyyy-MM-dd'),
      endDate: format(endOfDay(to), 'yyyy-MM-dd')
    };
  }, [dateRange]);

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

      {/* KPIs - Glass Design */}
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

      <TransactionDetailsSheet
        transactionId={detailsTransactionId}
        isLegacyId={isLegacyLookup}
        open={!!detailsTransactionId}
        onClose={handleCloseDetails}
      />

      <PageDebugger context={activeTab} />
    </div>
  );
}
