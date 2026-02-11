import { useState, useMemo } from 'react';
import { Landmark, TrendingUp, TrendingDown, Hash, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { format, subDays } from 'date-fns';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useBankTransactions, useBankBalanceHistory } from '@/hooks/useBancos';
import { BankTransactionsTable } from './BankTransactionsTable';
import { TransactionDetailsSheet } from '@/components/financeiro/TransactionDetailsSheet';
import { BalanceEvolutionChart } from './BalanceEvolutionChart';

interface BankHistorySheetProps {
    bankAccountId: string | null; // null = visão consolidada de todos
    bankName: string;
    bankColor?: string;
    currentBalance?: number;
    isOpen: boolean;
    onClose: () => void;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

export function BankHistorySheet({
    bankAccountId,
    bankName,
    bankColor,
    currentBalance,
    isOpen,
    onClose,
}: BankHistorySheetProps) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const pageSize = 10;

    // State para abrir detalhes de uma transação
    const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

    const { data, isLoading, error } = useBankTransactions(bankAccountId, page, pageSize, search);

    // Dados para o gráfico de evolução do saldo (últimos 30 dias)
    const { startDate, endDate } = useMemo(() => {
        const end = new Date();
        const start = subDays(end, 30);
        return {
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd')
        };
    }, []);

    const { data: balanceHistory = [], isLoading: loadingHistory } = useBankBalanceHistory(
        bankAccountId || '',
        startDate,
        endDate
    );

    const isConsolidatedView = bankAccountId === null;

    const handleTransactionClick = (transactionId: string) => {
        setSelectedTransactionId(transactionId);
    };

    const handleCloseTransactionDetails = () => {
        setSelectedTransactionId(null);
    };

    return (
        <>
            <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full">
                    <SheetHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            {isConsolidatedView ? (
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Layers className="w-5 h-5 text-primary" />
                                </div>
                            ) : (
                                <div
                                    className="p-2 rounded-lg"
                                    style={{ backgroundColor: bankColor ? `${bankColor}20` : 'hsl(var(--primary) / 0.1)' }}
                                >
                                    <Landmark
                                        className="w-5 h-5"
                                        style={{ color: bankColor || 'hsl(var(--primary))' }}
                                    />
                                </div>
                            )}
                            <div>
                                <SheetTitle>{bankName}</SheetTitle>
                                <SheetDescription>
                                    {isConsolidatedView
                                        ? 'Histórico de todas as contas'
                                        : 'Histórico de movimentações'}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* Saldo atual (se não for visão consolidada) */}
                    {!isConsolidatedView && currentBalance !== undefined && (
                        <div className="mb-4">
                            <BalanceEvolutionChart
                                data={balanceHistory}
                                isLoading={loadingHistory}
                            />
                        </div>
                    )}

                    {/* KPIs */}
                    {isLoading ? (
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                            <Skeleton className="h-16" />
                        </div>
                    ) : data && (
                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <div className="flex items-center gap-1 text-emerald-500 text-xs mb-1">
                                    <TrendingUp className="w-3 h-3" />
                                    Receitas
                                </div>
                                <p className="text-sm font-semibold text-emerald-500">
                                    {formatCurrency(data.totalIncome)}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <div className="flex items-center gap-1 text-red-500 text-xs mb-1">
                                    <TrendingDown className="w-3 h-3" />
                                    Despesas
                                </div>
                                <p className="text-sm font-semibold text-red-500">
                                    {formatCurrency(data.totalExpense)}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted border border-border">
                                <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                                    <Hash className="w-3 h-3" />
                                    Transações
                                </div>
                                <p className="text-sm font-semibold text-foreground">
                                    {data.totalCount}
                                </p>
                            </div>
                        </div>
                    )}

                    <Separator className="mb-4" />

                    {/* Search Input */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Pesquisar por descrição ou categoria..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1); // Reset page on search
                            }}
                            className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                        />
                    </div>

                    {/* Lista de Transações */}
                    <ScrollArea className="flex-1 -mr-4 pr-4">
                        {isLoading ? (
                            <div className="space-y-2">
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} className="h-16" />
                                ))}
                            </div>
                        ) : error ? (
                            <div className="text-center py-8 text-destructive">
                                <p>Erro ao carregar transações</p>
                            </div>
                        ) : data?.transactions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Landmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Nenhuma transação encontrada</p>
                                <p className="text-sm">
                                    {search ? 'Tente buscar com outro termo' : 'Este banco ainda não possui movimentações'}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <BankTransactionsTable
                                    transactions={(data?.transactions || []).map(tx => ({
                                        id: tx.transactionId,
                                        date: tx.transactionDate,
                                        bankName: tx.bankName || undefined,
                                        type: (tx.accountType === 'revenue' || tx.accountType === 'receita' || tx.amount >= 0) ? 'entrada' : 'saida',
                                        description: tx.description,
                                        category: tx.accountName || 'Sem categoria',
                                        amount: tx.amount,
                                        reconciliationStatus: 'conciliado'
                                    }))}
                                    showBankColumn={isConsolidatedView}
                                    onTransactionClick={handleTransactionClick}
                                />
                            </div>
                        )}
                    </ScrollArea>

                    {/* Paginação */}
                    {data && data.pageCount > 1 && (
                        <div className="pt-4 mt-auto border-t border-border">
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Anterior
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Página {page} de {data.pageCount}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(data.pageCount, p + 1))}
                                    disabled={page >= data.pageCount}
                                >
                                    Próxima
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Modal de detalhes da transação */}
            <TransactionDetailsSheet
                transactionId={selectedTransactionId}
                open={selectedTransactionId !== null}
                onClose={handleCloseTransactionDetails}
            />
        </>
    );
}
