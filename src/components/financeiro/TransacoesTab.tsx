import { useState, useMemo } from 'react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    TrendingUp,
    TrendingDown,
    Check,
    Clock,
    Info,
    Plus
} from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppCard } from '@/components/ui/app-card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { TransactionKpiCard, formatCurrency } from './shared/TransactionKpiCard';
import { TransactionsTable, Transaction } from './shared/TransactionsTable';
import { NovaReceitaModal } from './NovaReceitaModal';
import { NovaDespesaModal } from './NovaDespesaModal';
import { TransactionDetailsSheet } from './TransactionDetailsSheet';
// import { SettleTransactionModal } from './SettleTransactionModal';
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
    // const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    // const [settleModalOpen, setSettleModalOpen] = useState(false);

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

    // Despesas (já usa o hook correto, mas precisamos filtrar por período)
    const { data: allExpenses = [], isLoading: loadingExpenses } = useRecentTransactions('expense');

    // Summary e CashFlow
    const { data: summary } = useFinancialSummary(startDate, endDate);
    const { data: cashFlowData = [], isLoading: loadingCashFlow } = useCashFlowData(startDate, endDate);

    // ========== FILTERED TRANSACTIONS ==========

    const displayTransactions = useMemo((): Transaction[] => {
        if (transactionType === 'receitas') {
            if (statusFilter === 'pendente') {
                // Todas as pendentes históricas
                return allRevenue.filter(tx => !tx.reconciled);
            } else {
                // Confirmadas do período
                return periodRevenue.filter(tx => tx.reconciled);
            }
        } else {
            // Despesas - filtrar por período para efetivadas
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
                pendente: summary?.pendingIncome ?? 0
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

    // ========== SELECTION HANDLERS ==========

    // ========== SELECTION HANDLERS ==========

    // Selection logic removed per new requirements
    /*
    const selectableTransactions = displayTransactions.filter(tx => !tx.is_confirmed && tx.legacy_status === null);

    const handleToggleSelect = (id: string) => {
        const tx = displayTransactions.find(t => t.id === id);
        if (tx?.is_confirmed || tx?.legacy_status !== null) return;

        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(selectableTransactions.map(tx => tx.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleOpenSettleModal = () => {
        if (selectedIds.size === 0) return;
        setSettleModalOpen(true);
    };

    const handleSettleSuccess = () => {
        setSelectedIds(new Set());
    };
    */

    // Reset selection when switching tabs
    const handleTypeChange = (type: TransactionType) => {
        setTransactionType(type);
        // setSelectedIds(new Set());
    };

    const handleStatusChange = (status: StatusFilter) => {
        setStatusFilter(status);
        // setSelectedIds(new Set());
    };

    // ========== COMPUTED VALUES ==========

    /*
    const selectedTotalAmount = useMemo(() => {
        return displayTransactions
            .filter(tx => selectedIds.has(tx.id))
            .reduce((sum, tx) => sum + Math.abs(tx.amount || tx.total_amount || 0), 0);
    }, [displayTransactions, selectedIds]);
    */

    const syncedCount = displayTransactions.filter(tx => tx.legacy_status !== null && !tx.reconciled).length;

    // const showSelection = statusFilter === 'pendente';
    const isPendente = statusFilter === 'pendente';

    return (
        <div className="space-y-6">
            {/* Header with Type Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Tabs value={transactionType} onValueChange={(v) => handleTypeChange(v as TransactionType)} className="w-full sm:w-auto">
                    <TabsList className="grid grid-cols-2 w-full sm:w-[300px]">
                        <TabsTrigger value="receitas" className="gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Receitas
                        </TabsTrigger>
                        <TabsTrigger value="despesas" className="gap-2">
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
                <ToggleGroup
                    type="single"
                    value={statusFilter}
                    onValueChange={(val) => val && handleStatusChange(val as StatusFilter)}
                    className="bg-muted/50 p-1 rounded-lg"
                >
                    <ToggleGroupItem value="efetivado" className="gap-2 data-[state=on]:bg-background">
                        <Check className="w-4 h-4" />
                        Efetivado
                    </ToggleGroupItem>
                    <ToggleGroupItem value="pendente" className="gap-2 data-[state=on]:bg-background">
                        <Clock className="w-4 h-4" />
                        {transactionType === 'receitas' ? 'A Receber' : 'A Pagar'}
                    </ToggleGroupItem>
                </ToggleGroup>

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
            <AppCard className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4 px-4">
                    <div className="flex items-center gap-2">
                        {transactionType === 'receitas' ? (
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        ) : (
                            <TrendingDown className="w-5 h-5 text-rose-500" />
                        )}
                        <div>
                            <CardTitle className="text-base font-semibold text-foreground">
                                {transactionType === 'receitas'
                                    ? (isPendente ? 'Receitas Pendentes' : 'Receitas Confirmadas')
                                    : (isPendente ? 'Despesas Pendentes' : 'Despesas Pagas')}
                            </CardTitle>
                            {/* Description removed or moved to tooltip if needed for cleaner look, keeping title minimal as per reference */}
                        </div>
                    </div>

                    {/* Batch Action Button - Removed */}
                </CardHeader>
                <CardContent className="p-0">
                    <TransactionsTable
                        transactions={displayTransactions}
                        isLoading={isLoading}
                        type={transactionType === 'receitas' ? 'receita' : 'despesa'}
                        // showSelection={false}
                        selectedIds={new Set()}
                        onToggleSelect={() => { }}
                        onSelectAll={() => { }}
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

            {/* Settle Modal - Removed */}
            {/* 
            <SettleTransactionModal
                open={settleModalOpen}
                onClose={() => setSettleModalOpen(false)}
                transactionIds={
                    Array.from(selectedIds).map(id => {
                        const tx = displayTransactions.find(t => t.id === id);
                        return tx?.related_entity_id || id;
                    })
                }
                totalAmount={selectedTotalAmount}
                onSuccess={handleSettleSuccess}
            />
            */}
        </div>
    );
}
