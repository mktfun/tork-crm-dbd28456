import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Hash,
    ChevronLeft,
    ChevronRight,
    Landmark,
    Calendar,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useBankAccounts, useBankTransactions, BankAccount } from '@/hooks/useBancos';
import { BankTransactionsTable } from '@/components/financeiro/bancos/BankTransactionsTable';
import { TransactionDetailsSheet } from '@/components/financeiro/TransactionDetailsSheet';

interface BankDashboardViewProps {
    bankId: string; // 'todos' para consolidado ou UUID
    onBack: () => void;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

export function BankDashboardView({ bankId, onBack }: BankDashboardViewProps) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    // Se id for "todos", é visão consolidada
    const pageSize = 10;

    // Se id for "todos", é visão consolidada
    const isConsolidated = bankId === 'todos';
    const bankAccountId = isConsolidated ? null : bankId;

    // Buscar dados do banco
    const { data: bankData, isLoading: loadingAccounts, refetch: refetchAccounts } = useBankAccounts();
    const { data: transactionsData, isLoading: loadingTransactions, error: transactionsError, refetch: refetchTransactions } =
        useBankTransactions(bankAccountId, page, pageSize, search);

    // Encontrar o banco atual
    const currentBank: BankAccount | undefined = isConsolidated
        ? undefined
        : bankData?.accounts.find(acc => acc.id === bankId);

    // State para detalhes de transação
    const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

    const handleRefresh = () => {
        refetchAccounts();
        refetchTransactions();
    };

    const handleTransactionClick = (transactionId: string) => {
        setSelectedTransactionId(transactionId);
    };

    // Loading state
    if (loadingAccounts && !bankData) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                    <Skeleton className="h-32" />
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    // Banco não encontrado
    if (!isConsolidated && !currentBank && !loadingAccounts) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Landmark className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg mb-4">Banco não encontrado</p>
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para lista
                </Button>
            </div>
        );
    }

    const displayName = isConsolidated ? 'Todos os Bancos' : (currentBank?.bankName || 'Banco');
    const displayColor = isConsolidated ? undefined : currentBank?.color;
    const displayBalance = isConsolidated ? (bankData?.totalBalance || 0) : (currentBank?.currentBalance || 0);

    return (
        <div className="space-y-6">
            {/* Header com navegação */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div
                            className="p-3 rounded-xl"
                            style={{
                                backgroundColor: displayColor ? `${displayColor}20` : 'hsl(var(--primary) / 0.1)'
                            }}
                        >
                            <Landmark
                                className="w-7 h-7"
                                style={{ color: displayColor || 'hsl(var(--primary))' }}
                            />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{displayName}</h1>
                            {!isConsolidated && currentBank?.accountNumber && (
                                <p className="text-sm text-muted-foreground">
                                    Conta: {currentBank.accountNumber}
                                    {currentBank.agency && ` | Ag: ${currentBank.agency}`}
                                </p>
                            )}
                            {isConsolidated && (
                                <p className="text-sm text-muted-foreground">
                                    {bankData?.activeAccounts || 0} contas ativas
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <Button variant="outline" size="icon" onClick={handleRefresh}>
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Card de Saldo Principal */}
            <Card
                className="overflow-hidden border-border bg-card"
                style={{
                    borderTop: `4px solid ${displayColor || 'hsl(var(--primary))'}`
                }}
            >
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Saldo Atual</p>
                            <p
                                className="text-4xl font-bold"
                                style={{ color: displayColor || 'hsl(var(--primary))' }}
                            >
                                {formatCurrency(displayBalance)}
                            </p>
                            {!isConsolidated && currentBank && (
                                <div className="flex items-center gap-2 mt-3">
                                    <Badge variant={currentBank.isActive ? 'default' : 'secondary'}>
                                        {currentBank.isActive ? 'Ativa' : 'Inativa'}
                                    </Badge>
                                    <Badge variant="outline">{currentBank.accountType}</Badge>
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-muted-foreground text-sm mb-1">
                                <Calendar className="w-4 h-4" />
                                Atualizado agora
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPIs */}
            {loadingTransactions ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
            ) : transactionsData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-emerald-500/30 bg-emerald-500/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-emerald-500 mb-2">
                                <TrendingUp className="w-5 h-5" />
                                <span className="text-sm font-medium">Receitas</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-500">
                                {formatCurrency(transactionsData.totalIncome)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-red-500/30 bg-red-500/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-red-500 mb-2">
                                <TrendingDown className="w-5 h-5" />
                                <span className="text-sm font-medium">Despesas</span>
                            </div>
                            <p className="text-2xl font-bold text-red-500">
                                {formatCurrency(transactionsData.totalExpense)}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-border bg-muted/30">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground mb-2">
                                <Hash className="w-5 h-5" />
                                <span className="text-sm font-medium">Transações</span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                                {transactionsData.totalCount}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Histórico de Transações */}
            <Card className="border-border bg-card">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Histórico de Movimentações</CardTitle>
                    <div className="w-64">
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                        />
                    </div>
                </CardHeader>
                <Separator className="bg-border" />
                <CardContent className="p-0">
                    {loadingTransactions ? (
                        <div className="p-4 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-16" />
                            ))}
                        </div>
                    ) : transactionsError ? (
                        <div className="text-center py-12 text-destructive">
                            <p className="mb-2">Erro ao carregar transações</p>
                            <Button variant="outline" size="sm" onClick={() => refetchTransactions()}>
                                Tentar novamente
                            </Button>
                        </div>
                    ) : transactionsData?.transactions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Landmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-lg font-medium text-foreground">Nenhuma transação encontrada</p>
                            <p className="text-sm mb-4">
                                {search ? 'Tente buscar com outro termo' : 'Para visualizar transações aqui, você precisa conciliar os lançamentos.'}
                            </p>
                            {!search && (
                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/dashboard/financeiro?tab=conciliacao')}
                                >
                                    Ir para Conciliação Bancária
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="max-h-[600px] overflow-auto">
                            <BankTransactionsTable
                                transactions={(transactionsData?.transactions || []).map(tx => ({
                                    id: tx.transactionId,
                                    date: tx.transactionDate,
                                    bankName: tx.bankName || undefined,
                                    type: (tx.accountType === 'revenue' || tx.accountType === 'receita' || tx.amount >= 0) ? 'entrada' : 'saida',
                                    description: tx.description,
                                    category: tx.accountName || 'Sem categoria',
                                    amount: tx.amount,
                                    reconciliationStatus: 'conciliado' // Hardcoded conforme solicitação visual
                                }))}
                                showBankColumn={isConsolidated}
                                onTransactionClick={handleTransactionClick}
                            />
                        </div>
                    )}

                    {/* Paginação */}
                    {transactionsData && transactionsData.pageCount > 1 && (
                        <>
                            <Separator className="bg-border" />
                            <div className="flex items-center justify-between p-4">
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
                                    Página {page} de {transactionsData.pageCount}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(transactionsData.pageCount, p + 1))}
                                    disabled={page >= transactionsData.pageCount}
                                >
                                    Próxima
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Modal de detalhes da transação */}
            <TransactionDetailsSheet
                transactionId={selectedTransactionId}
                open={selectedTransactionId !== null}
                onClose={() => setSelectedTransactionId(null)}
            />
        </div>
    );
}
