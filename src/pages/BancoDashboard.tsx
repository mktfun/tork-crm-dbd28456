import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { BankTransactionRow } from '@/components/financeiro/bancos/BankTransactionRow';
import { TransactionDetailsSheet } from '@/components/financeiro/TransactionDetailsSheet';

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

export default function BancoDashboard() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const pageSize = 20;

    // Se id for "todos", é visão consolidada
    const isConsolidated = id === 'todos';
    const bankAccountId = isConsolidated ? null : id || null;

    // Buscar dados do banco
    const { data: bankData, isLoading: loadingAccounts, refetch: refetchAccounts } = useBankAccounts();
    const { data: transactionsData, isLoading: loadingTransactions, error: transactionsError, refetch: refetchTransactions } =
        useBankTransactions(bankAccountId, page, pageSize);

    // Encontrar o banco atual
    const currentBank: BankAccount | undefined = isConsolidated
        ? undefined
        : bankData?.accounts.find(acc => acc.id === id);

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
            <div className="space-y-6 p-6">
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
                <Button variant="outline" onClick={() => navigate('/dashboard/financeiro')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Financeiro
                </Button>
            </div>
        );
    }

    const displayName = isConsolidated ? 'Todos os Bancos' : (currentBank?.bankName || 'Banco');
    const displayColor = isConsolidated ? undefined : currentBank?.color;
    const displayBalance = isConsolidated ? (bankData?.totalBalance || 0) : (currentBank?.currentBalance || 0);

    return (
        <div className="space-y-6 p-6">
            {/* Header com navegação */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/dashboard/financeiro')}
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
                className="overflow-hidden"
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
                            <p className="text-2xl font-bold">
                                {transactionsData.totalCount}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Histórico de Transações */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Histórico de Movimentações</CardTitle>
                </CardHeader>
                <Separator />
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
                            <p className="text-lg">Nenhuma transação encontrada</p>
                            <p className="text-sm">Este banco ainda não possui movimentações</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {transactionsData?.transactions.map((tx) => (
                                <BankTransactionRow
                                    key={tx.transactionId}
                                    transaction={tx}
                                    showBankName={isConsolidated}
                                    onClick={handleTransactionClick}
                                />
                            ))}
                        </div>
                    )}

                    {/* Paginação */}
                    {transactionsData && transactionsData.pageCount > 1 && (
                        <>
                            <Separator />
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
