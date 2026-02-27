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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useBankAccounts, useBankTransactions, useBankRealtime, BankAccount } from '@/hooks/useBancos';
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
    // Buscar 1000 itens para permitir agregação no front sem alterar SQL
    const pageSize = 1000;

    // Se id for "todos", é visão consolidada
    const isConsolidated = bankId === 'todos';
    const bankAccountId = isConsolidated ? null : bankId;

    // Ativar atualizações em tempo real
    useBankRealtime();

    // Buscar dados do banco

    // Buscar dados do banco
    const { data: bankData, isLoading: loadingAccounts, refetch: refetchAccounts } = useBankAccounts();
    // Fetch inicial grande para cálculo local
    const { data: transactionsData, isLoading: loadingTransactions, error: transactionsError, refetch: refetchTransactions } =
        useBankTransactions(bankAccountId, 1, pageSize, search);

    // Lógica Client-Side para Totais e Paginação
    const allTransactions = transactionsData?.transactions || [];

    // Filtrar Apenas Conciliados para exibição na Dashboard (Totals + Lista)
    // O usuário solicitou explicitamente que "não conciliados" não apareçam e não somem
    const validTransactions = allTransactions.filter(t => t.isReconciled);

    // Classificar cada transação como receita ou despesa
    // Estratégia: usa accountType quando disponível, senão fallback pelo sinal do amount
    const classifyTransaction = (t: typeof validTransactions[0]) => {
        const type = (t.accountType || '').toLowerCase();
        if (['revenue', 'receita', 'income', 'entrada'].includes(type)) return 'income';
        if (['expense', 'despesa', 'saida'].includes(type)) return 'expense';
        // Fallback pelo sinal do valor
        return t.amount >= 0 ? 'income' : 'expense';
    };

    // Calcular totais com base nos filtrados
    const clientTotalIncome = validTransactions
        .filter(t => classifyTransaction(t) === 'income')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const clientTotalExpense = validTransactions
        .filter(t => classifyTransaction(t) === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const clientTotalCount = validTransactions.length;

    // Paginação Client-Side da lista filtrada
    const itemsPerPage = 10;
    const totalPages = Math.ceil(clientTotalCount / itemsPerPage) || 1;
    const paginatedTransactions = validTransactions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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
            <div
                className="glass-component p-0 shadow-lg border-border bg-card overflow-hidden"
                style={{ borderTop: `4px solid ${displayColor || 'hsl(var(--primary))'}` }}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Saldo Atual</p>
                            <p className="text-4xl font-bold" style={{ color: displayColor || 'hsl(var(--primary))' }}>
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
                </div>
            </div>

            {/* KPIs */}
            {loadingTransactions ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
            ) : transactionsData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-component p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border-border bg-card hover:bg-secondary/70">
                        <div className="flex items-center gap-2 text-emerald-500 mb-2">
                            <TrendingUp className="w-5 h-5" />
                            <span className="text-sm font-medium text-muted-foreground">Receitas</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold text-emerald-500">
                            {formatCurrency(clientTotalIncome)}
                        </p>
                        <span className="text-xs text-muted-foreground mt-1">(base: transações conciliadas)</span>
                    </div>

                    <div className="glass-component p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border-border bg-card hover:bg-secondary/70">
                        <div className="flex items-center gap-2 text-red-500 mb-2">
                            <TrendingDown className="w-5 h-5" />
                            <span className="text-sm font-medium text-muted-foreground">Despesas</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold text-red-500">
                            {formatCurrency(clientTotalExpense)}
                        </p>
                        <span className="text-xs text-muted-foreground mt-1">(base: transações conciliadas)</span>
                    </div>

                    <div className="glass-component p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border-border bg-card hover:bg-secondary/70">
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                            <Hash className="w-5 h-5" />
                            <span className="text-sm font-medium text-muted-foreground">Transações</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold text-foreground">
                            {clientTotalCount}
                        </p>
                    </div>
                </div>
            )}

            {/* Histórico de Transações */}
            <div className="glass-component p-0 shadow-lg border-border bg-card">
                <div className="flex flex-col space-y-1.5 p-6 pb-3 flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Landmark className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Histórico de Movimentações</h3>
                    </div>
                    <div className="w-64">
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full px-3 py-1.5 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
                        />
                    </div>
                </div>
                <Separator className="bg-border" />
                <div className="p-0">
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
                    ) : paginatedTransactions.length === 0 ? (
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
                                transactions={paginatedTransactions.map(tx => ({
                                    id: tx.transactionId,
                                    date: tx.transactionDate,
                                    bankName: tx.bankName || undefined,
                                    type: (['revenue', 'receita', 'income', 'entrada'].includes((tx.accountType || '').toLowerCase())) ? 'entrada' : 'saida',
                                    description: tx.description,
                                    category: tx.accountName || 'Sem categoria',
                                    amount: tx.amount,
                                    reconciliationStatus: tx.isReconciled ? 'conciliado' : 'pendente'
                                }))}
                                showBankColumn={isConsolidated}
                                onTransactionClick={handleTransactionClick}
                            />
                        </div>
                    )}

                    {/* Paginação */}
                    {clientTotalCount > itemsPerPage && (
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
                                    Página {page} de {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                >
                                    Próxima
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal de detalhes da transação */}
            <TransactionDetailsSheet
                transactionId={selectedTransactionId}
                open={selectedTransactionId !== null}
                onClose={() => setSelectedTransactionId(null)}
            />
        </div>
    );
}
