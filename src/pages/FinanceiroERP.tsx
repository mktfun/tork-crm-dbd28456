import { useState, useEffect, useMemo } from 'react';
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
  GitCompare
} from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  useFinancialAccountsWithDefaults,
  useRecentTransactions,
  useCashFlowData,
  useFinancialSummary,
  useTotalPendingReceivables,
  usePendingThisMonth
} from '@/hooks/useFinanceiro';
import { usePageTitle } from '@/hooks/usePageTitle';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';

// ============ KPI CONFIGURATION - 4 KPIS SIMPLES ============

const FIXED_KPIS = [
  { id: 'totalIncome', label: 'Recebido no Mês' },
  { id: 'totalExpense', label: 'Despesas do Mês' },
  { id: 'pendingThisMonth', label: 'Vencendo este Mês' },
  { id: 'totalPending', label: 'Total Geral a Receber' },
] as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// ============ 3 KPIs GLOBAIS NO HEADER ============

interface GlobalKpiCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  variant: 'primary' | 'success' | 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  subtitle?: string;
  tooltip?: string;
}

function GlobalKpiCard({ title, value, icon: Icon, variant, isLoading, subtitle, tooltip }: GlobalKpiCardProps) {
  const styles = {
    primary: 'from-primary/10 to-primary/5 border-primary/20',
    success: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
    danger: 'from-rose-500/10 to-rose-600/5 border-rose-500/20',
    warning: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    info: 'from-sky-500/10 to-sky-600/5 border-sky-500/20',
  };
  const iconStyles = {
    primary: 'bg-primary/20 text-primary',
    success: 'bg-emerald-500/20 text-emerald-500',
    danger: 'bg-rose-500/20 text-rose-500',
    warning: 'bg-amber-500/20 text-amber-500',
    info: 'bg-sky-500/20 text-sky-500',
  };
  const valueStyles = {
    primary: 'text-foreground',
    success: 'text-emerald-500',
    danger: 'text-rose-500',
    warning: 'text-amber-500',
    info: 'text-sky-500',
  };

  const cardContent = (
    <Card className={cn('bg-gradient-to-br border', styles[variant])}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-lg', iconStyles[variant])}>
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
                <p className={cn('text-xl font-bold', valueStyles[variant])}>
                  {formatCurrency(value)}
                </p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                )}
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

// ============ SIMPLE 4 KPI SECTION ============

interface KpiSectionProps {
  summary: {
    totalIncome?: number;
    totalExpense?: number;
  } | null | undefined;
  pendingThisMonth: { total_amount: number; pending_count: number } | undefined;
  totalPending: { total_amount: number; pending_count: number } | undefined;
  isLoading: boolean;
}

function KpiSection({ summary, pendingThisMonth, totalPending, isLoading }: KpiSectionProps) {
  const kpis = [
    {
      title: 'Recebido no Mês',
      value: summary?.totalIncome ?? 0,
      icon: TrendingUp,
      variant: 'success' as const,
      tooltip: 'Receitas confirmadas no período selecionado. Apenas transações com status "completed" são contabilizadas.',
    },
    {
      title: 'Despesas do Mês',
      value: summary?.totalExpense ?? 0,
      icon: TrendingDown,
      variant: 'danger' as const,
      tooltip: 'Despesas confirmadas no período selecionado. Apenas transações com status "completed" são contabilizadas.',
    },
    {
      title: 'Vencendo este Mês',
      value: pendingThisMonth?.total_amount ?? 0,
      icon: CalendarClock,
      variant: 'warning' as const,
      subtitle: pendingThisMonth?.pending_count ? `${pendingThisMonth.pending_count} parcelas` : undefined,
      tooltip: 'Receitas pendentes (a receber) com vencimento no mês atual. Baseado na data de vencimento (due_date).',
    },
    {
      title: 'Total Geral a Receber',
      value: totalPending?.total_amount ?? 0,
      icon: Clock,
      variant: 'info' as const,
      subtitle: totalPending?.pending_count ? `${totalPending.pending_count} parcelas` : undefined,
      tooltip: 'Total histórico de receitas pendentes (a receber), independente da data. Não é filtrado pelo período selecionado.',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <GlobalKpiCard
          key={kpi.title}
          title={kpi.title}
          value={kpi.value}
          icon={kpi.icon}
          variant={kpi.variant}
          isLoading={isLoading}
          subtitle={kpi.subtitle}
          tooltip={kpi.tooltip}
        />
      ))}
    </div>
  );
}

// ============ VISÃO GERAL (APENAS GRÁFICO) ============

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
      {/* ========== SEÇÃO 1: FLUXO DE CAIXA ========== */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Fluxo de Caixa
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ModuloFaturamento
            onClick={() => onTabChange('transacoes')}
            dateRange={dateRange}
          />
          <ModuloMultiBancos onClick={() => onTabChange('caixa')} />
        </div>
      </div>

      {/* ========== SEÇÃO 2: TESOURARIA & CONTAS ========== */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Tesouraria & Contas
        </h3>
        <ModuloTesouraria onClick={() => onTabChange('tesouraria')} />
      </div>

      {/* ========== GRÁFICO DE FLUXO DE CAIXA ========== */}
      <CashFlowChart
        data={cashFlowData}
        isLoading={cashFlowLoading}
        granularity="day"
      />
    </div>
  );
}

// ... (DRE Tab and RecentMovements remain the same) ...

// Inside TabsContent in FinanceiroERP function:
/*
        <TabsContent value="visao-geral">
          <VisaoGeral
            dateRange={dateRange}
            onNavigate={(path) => navigate(path)}
            onTabChange={setActiveTab}
          />
          
          {/* ========== SEÇÃO 3: ÚLTIMAS MOVIMENTAÇÕES ========== * /}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Últimas Movimentações
            </h3>
            <RecentMovements onViewDetails={handleViewTransactionDetails} />
          </div>
        </TabsContent>
*/

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
      </Tabs >


  {/* Deep Link Details Sheet */ }
  < TransactionDetailsSheet
transactionId = { detailsTransactionId }
isLegacyId = { isLegacyLookup }
open = {!!detailsTransactionId}
onClose = { handleCloseDetails }
  />
    </div >
  );
}
