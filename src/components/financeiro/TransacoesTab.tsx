import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import {
    TrendingUp,
    TrendingDown,
    Check,
    Clock,
    Info,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppCard } from '@/components/ui/app-card';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { TransactionKpiCard } from './shared/TransactionKpiCard';
import { TransactionsTable, Transaction } from './shared/TransactionsTable';
import { NovaReceitaModal } from './NovaReceitaModal';
import { NovaDespesaModal } from './NovaDespesaModal';
import { TransactionDetailsSheet } from './TransactionDetailsSheet';
import { FaturamentoChart } from './faturamento/FaturamentoChart';
import { FaturamentoBreakdown } from './faturamento/FaturamentoBreakdown';
import { MetasCard } from './faturamento/MetasCard';
import { RecurringConfigsList } from './RecurringConfigsList';
import { ExpenseEvolutionChart } from './despesas/ExpenseEvolutionChart';

import {
    useRevenueTransactions,
    useRecentTransactions,
    useFinancialSummary,
    useCashFlowData
} from '@/hooks/useFinanceiro';

interface TransacoesTabProps {
    dateRange: DateRange | undefined;
}

type TransactionType = 'receitas' | 'despesas';
type StatusFilter = 'efetivado' | 'pendente';

export function TransacoesTab({ dateRange }: TransacoesTabProps) {
    const [transactionType, setTransactionType] = useState<TransactionType>('receitas');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('efetivado');
    const [detailsId, setDetailsId] = useState<string | null>(null);

    // Datas normalizadas
    const { startDate, endDate } = useMemo(() => {
        const from = dateRange?.from || new Date();
        const to = dateRange?.to || new Date();
        return {
            startDate: format(startOfDay(from), 'yyyy-MM-dd'),
            endDate: format(endOfDay(to), 'yyyy-MM-dd')
        };
    }, [dateRange]);

    // ========== DATA FETCHING ==========

    // Receitas
    const { data: periodRevenue = [], isLoading: loadingPeriodRevenue } = useRevenueTransactions(startDate, endDate);
    const { data: allRevenue = [], isLoading: loadingAllRevenue } = useRevenueTransactions('2000-01-01', '2100-12-31');

    // Despesas
    const { data: allExpenses = [], isLoading: loadingExpenses } = useRecentTransactions('expense');

    // Summary e CashFlow
    const { data: summary } = useFinancialSummary(startDate, endDate);
    const { data: cashFlowData = [], isLoading: loadingCashFlow } = useCashFlowData(startDate, endDate);

    // ========== FILTERED TRANSACTIONS ==========
    // Efetivado = reconciled === true (conciliado via aba Conciliação)
    // Pendente  = reconciled === false (aguardando conciliação)

    const displayTransactions = useMemo((): Transaction[] => {
        if (transactionType === 'receitas') {
            if (statusFilter === 'pendente') {
                return allRevenue.filter(tx => !tx.reconciled);
            } else {
                return periodRevenue.filter(tx => tx.reconciled);
            }
        } else {
            const txDate = (tx: any) => tx.transaction_date ? new Date(tx.transaction_date) : null;
            const inPeriod = (d: Date | null) => {
                if (!d) return false;
                const start = new Date(startDate);
                const end = new Date(endDate);
                return d >= start && d <= end;
            };

            if (statusFilter === 'pendente') {
                return allExpenses
                    .filter(tx => !tx.reconciled)
                    .map(tx => ({
                        ...tx,
                        amount: tx.total_amount ?? 0
                    }));
            } else {
                return allExpenses
                    .filter(tx => tx.reconciled && inPeriod(txDate(tx)))
                    .map(tx => ({
                        ...tx,
                        amount: tx.total_amount ?? 0
                    }));
            }
        }
    }, [transactionType, statusFilter, periodRevenue, allRevenue, allExpenses, startDate, endDate]);

    const isLoading = transactionType === 'receitas'
        ? (statusFilter === 'pendente' ? loadingAllRevenue : loadingPeriodRevenue)
        : loadingExpenses;

    // ========== KPIs ==========

    const kpis = useMemo(() => {
        if (transactionType === 'receitas') {
            const confirmadas = periodRevenue.filter(tx => tx.reconciled);
            return {
                efetivado: confirmadas.reduce((sum, tx) => sum + (tx.amount || 0), 0),
                pendente: summary?.current?.pendingIncome ?? 0
            };
        } else {
            const efetivadas = allExpenses.filter(tx => tx.reconciled);
            const pendentes = allExpenses.filter(tx => !tx.reconciled);
            return {
                efetivado: efetivadas.reduce((sum, tx) => sum + Math.abs(tx.total_amount || 0), 0),
                pendente: pendentes.reduce((sum, tx) => sum + Math.abs(tx.total_amount || 0), 0)
            };
        }
    }, [transactionType, periodRevenue, allExpenses, summary]);

    // ========== COMPUTED ==========

    const syncedCount = displayTransactions.filter(tx => tx.legacy_status !== null && !tx.reconciled).length;
    const isPendente = statusFilter === 'pendente';

    return (
        <div className="space-y-6">
            {/* Header with Type Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Tabs value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)} className="w-full sm:w-auto">
                    <TabsList className="grid grid-cols-2 w-full sm:w-[300px] bg-foreground/5 backdrop-blur-md border border-foreground/10 p-1 rounded-xl">
                        <TabsTrigger value="receitas" className="gap-2 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground">
                            <TrendingUp className="w-4 h-4" />
                            Receitas
                        </TabsTrigger>
                        <TabsTrigger value="despesas" className="gap-2 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground">
                            <TrendingDown className="w-4 h-4" />
                            Despesas
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                    {transactionType === 'receitas' ? <NovaReceitaModal /> : <NovaDespesaModal />}
                </div>
            </div>

            {/* Status Toggle + KPIs */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Tabs value={statusFilter} onValueChange={(val) => val && setStatusFilter(val as StatusFilter)} className="w-auto">
                    <TabsList className="bg-foreground/5 backdrop-blur-md border border-foreground/10 p-1 rounded-xl h-9">
                        <TabsTrigger value="efetivado" className="gap-2 text-xs px-3 h-7 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground">
                            <Check className="w-4 h-4" />
                            Conciliado
                        </TabsTrigger>
                        <TabsTrigger value="pendente" className="gap-2 text-xs px-3 h-7 data-[state=active]:bg-foreground/10 data-[state=active]:text-foreground">
                            <Clock className="w-4 h-4" />
                            {transactionType === 'receitas' ? 'A Receber' : 'A Pagar'}
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex-1 grid grid-cols-2 gap-3">
                    <TransactionKpiCard
                        title={transactionType === 'receitas' ? 'Recebido no Período' : 'Pago no Período'}
                        value={kpis.efetivado}
                        variant="success"
                        icon={Check}
                    />
                    <TransactionKpiCard
                        title={transactionType === 'receitas' ? 'Previsão a Receber' : 'Previsão a Pagar'}
                        value={kpis.pendente}
                        variant={transactionType === 'receitas' ? 'warning' : 'danger'}
                        icon={Clock}
                    />
                </div>
            </div>

            {/* Chart - only for receitas efetivadas */}
            {transactionType === 'receitas' && statusFilter === 'efetivado' && (
                <FaturamentoChart data={cashFlowData} isLoading={loadingCashFlow} />
            )}

            {/* Chart - only for despesas efetivadas */}
            {transactionType === 'despesas' && statusFilter === 'efetivado' && (
                <ExpenseEvolutionChart data={cashFlowData} isLoading={loadingCashFlow} />
            )}

            {/* Extra Cards - Metas/Breakdown for receitas */}
            {transactionType === 'receitas' && statusFilter === 'efetivado' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MetasCard faturamentoAtual={kpis.efetivado} />
                    <FaturamentoBreakdown dateRange={dateRange} />
                </div>
            )}

            {/* Sync Info */}
            {syncedCount > 0 && isPendente && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                    <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">
                        {syncedCount} transação(ões) sincronizada(s) com apólices.
                        Para alterá-las, edite diretamente na apólice correspondente.
                    </span>
                </div>
            )}

            {/* Main Table */}
            <AppCard>
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            {transactionType === 'receitas' ? (
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <TrendingDown className="w-5 h-5 text-rose-500" />
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-foreground">
                                {transactionType === 'receitas'
                                    ? (isPendente ? 'Receitas Pendentes' : 'Receitas Conciliadas')
                                    : (isPendente ? 'Despesas Pendentes' : 'Despesas Conciliadas')}
                            </CardTitle>
                            <CardDescription>
                                {isPendente
                                    ? 'Aguardando conciliação na aba Conciliação'
                                    : 'Transações conciliadas no período selecionado'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <TransactionsTable
                        transactions={displayTransactions}
                        isLoading={isLoading}
                        type={transactionType === 'receitas' ? 'receita' : 'despesa'}
                        onViewDetails={(id) => setDetailsId(id)}
                        pageSize={10}
                    />
                </CardContent>
            </AppCard>

            {/* Configurações Recorrentes (Apenas Despesas) */}
            {transactionType === 'despesas' && (
                <div className="pt-8 border-t">
                    <RecurringConfigsList type="all" />
                </div>
            )}

            {/* Details Sheet */}
            <TransactionDetailsSheet
                transactionId={detailsId}
                isLegacyId={false}
                open={!!detailsId}
                onClose={() => setDetailsId(null)}
            />
        </div>
    );
}
