import { useState, useMemo } from 'react';
import {
    GitCompare,
    Upload,
    CheckCircle2,
    XCircle,
    ArrowRightLeft,
    RefreshCw,
    Landmark,
    AlertCircle,
    Sparkles,
    Plus,
    EyeOff,
    TrendingUp,
    TrendingDown,
    Scale,
    History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate } from '@/utils/dateUtils';
import { useBankAccounts } from '@/hooks/useBancos';
import {
    usePendingReconciliation,
    useMatchSuggestions,
    useReconcileManual,
    useIgnoreEntry,
    useReconciliationDashboard
} from '@/hooks/useReconciliation';
import { StatementImporter } from './StatementImporter';
import { MatchSuggestions } from './MatchSuggestions';
import { cn } from '@/lib/utils';

export function ReconciliationPage() {
    const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
    const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([]);
    const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);
    const [showImporter, setShowImporter] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Buscar contas bancárias
    const { data: bankAccounts, isLoading: isLoadingAccounts } = useBankAccounts();

    // Buscar dashboard de reconciliação
    const { data: dashboardData } = useReconciliationDashboard();

    // Buscar transações pendentes
    const {
        data: pendingData,
        isLoading: isLoadingPending,
        refetch: refetchPending
    } = usePendingReconciliation(selectedBankAccountId);

    // Buscar sugestões de match
    const { data: suggestions } = useMatchSuggestions(selectedBankAccountId);

    // Mutations
    const reconcileMutation = useReconcileManual();
    const ignoreMutation = useIgnoreEntry();

    // Dados do dashboard para a conta selecionada
    const selectedAccountDashboard = useMemo(() => {
        if (!selectedBankAccountId || !dashboardData) return null;
        return dashboardData.find(d => d.bank_account_id === selectedBankAccountId);
    }, [selectedBankAccountId, dashboardData]);

    // Handlers
    const handleSelectStatementItem = (id: string) => {
        setSelectedStatementIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectSystemItem = (id: string) => {
        setSelectedSystemIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleManualMatch = async () => {
        if (selectedStatementIds.length !== 1 || selectedSystemIds.length !== 1) {
            return;
        }

        await reconcileMutation.mutateAsync({
            statementEntryId: selectedStatementIds[0],
            systemTransactionId: selectedSystemIds[0],
        });

        setSelectedStatementIds([]);
        setSelectedSystemIds([]);
    };

    const handleIgnoreSelected = async () => {
        for (const id of selectedStatementIds) {
            await ignoreMutation.mutateAsync({ statementEntryId: id });
        }
        setSelectedStatementIds([]);
    };

    const handleRefresh = () => {
        refetchPending();
    };

    // Calcular progresso de reconciliação
    const reconciliationProgress = useMemo(() => {
        if (!selectedAccountDashboard) return 0;
        const total = selectedAccountDashboard.statement_entries_count || 1;
        const matched = selectedAccountDashboard.already_matched || 0;
        return Math.round((matched / total) * 100);
    }, [selectedAccountDashboard]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <GitCompare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Conciliação Bancária</h2>
                        <p className="text-sm text-muted-foreground">
                            Compare extratos bancários com transações do sistema
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleRefresh}
                        disabled={!selectedBankAccountId}
                        className="gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Atualizar
                    </Button>
                    <Button
                        onClick={() => setShowImporter(true)}
                        disabled={!selectedBankAccountId}
                        className="gap-2 bg-primary hover:bg-primary/90"
                    >
                        <Upload className="w-4 h-4" />
                        Importar Extrato
                    </Button>
                </div>
            </div>

            {/* Seletor de Conta */}
            <AppCard className="p-4 bg-muted/20 border-muted/30">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                            Conta Bancária
                        </label>
                        {isLoadingAccounts ? (
                            <Skeleton className="h-10 w-full" />
                        ) : (
                            <Select
                                value={selectedBankAccountId || ""}
                                onValueChange={(value) => {
                                    setSelectedBankAccountId(value);
                                    setSelectedStatementIds([]);
                                    setSelectedSystemIds([]);
                                }}
                            >
                                <SelectTrigger className="w-full bg-background/50 border-muted/50">
                                    <SelectValue placeholder="Escolha uma conta bancária..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {bankAccounts?.accounts?.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.bankName} {account.accountNumber ? `- ${account.accountNumber}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    {selectedAccountDashboard && (
                        <div className="flex flex-col items-end px-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Status Global</span>
                            <Badge className={cn(
                                "py-1 px-3 font-bold",
                                selectedAccountDashboard.reconciliation_status === 'fully_reconciled' 
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            )} variant="outline">
                                {selectedAccountDashboard.reconciliation_status === 'fully_reconciled' ? 'Conciliação em Dia' : 'Pendências Encontradas'}
                            </Badge>
                        </div>
                    )}
                </div>
            </AppCard>

            {/* Dashboard da Conta Selecionada - Estilo Liquid Glass 2026 */}
            {selectedAccountDashboard && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <AppCard className="p-4 bg-gradient-to-br from-background to-muted/20 border-muted/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Landmark className="w-12 h-12" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Landmark className="w-3 h-3" /> Saldo Banco (Extrato)
                        </p>
                        <p className="text-2xl font-black text-foreground tabular-nums">
                            {formatCurrency(selectedAccountDashboard.statement_total)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                             Baseado no último extrato importado
                        </p>
                    </AppCard>

                    <AppCard className="p-4 bg-gradient-to-br from-background to-muted/20 border-muted/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <History className="w-12 h-12" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                            <History className="w-3 h-3" /> Saldo Sistema (Ledger)
                        </p>
                        <p className="text-2xl font-black text-foreground tabular-nums">
                            {formatCurrency(selectedAccountDashboard.current_balance)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Valor total registrado no CRM
                        </p>
                    </AppCard>

                    <AppCard className={cn(
                        "p-4 relative overflow-hidden group border-none shadow-md",
                        selectedAccountDashboard.diff_amount === 0 
                            ? "bg-emerald-500/10 text-emerald-500" 
                            : "bg-rose-500/10 text-rose-500"
                    )}>
                        <div className="absolute top-0 right-0 p-3 opacity-20">
                            <Scale className="w-12 h-12" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 flex items-center gap-1.5">
                            <Scale className="w-3 h-3" /> Diferença (A Conciliar)
                        </p>
                        <p className="text-2xl font-black tabular-nums">
                            {formatCurrency(selectedAccountDashboard.diff_amount)}
                        </p>
                        <p className="text-[10px] opacity-80 mt-1">
                            {selectedAccountDashboard.diff_amount === 0 
                                ? "Tudo batendo! Saldo 100% correto." 
                                : "Ajuste as transações pendentes para igualar."}
                        </p>
                    </AppCard>

                    <AppCard className="p-4 bg-primary/5 border-primary/20 relative overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
                            <TrendingUp className="w-3 h-3" /> Conciliadas na Sessão
                        </p>
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-2xl font-black text-primary tabular-nums">
                                {selectedAccountDashboard.already_matched}
                            </p>
                            <span className="text-xs font-bold text-primary/80">{reconciliationProgress}% do total</span>
                        </div>
                        <Progress value={reconciliationProgress} className="h-1.5 bg-primary/20" indicatorClassName="bg-primary" />
                    </AppCard>
                </div>
            )}

            {/* Sugestões Automáticas */}
            {suggestions && suggestions.length > 0 && !showSuggestions && (
                <Alert className="bg-blue-500/10 border-blue-500/20 py-4 shadow-sm">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                    <AlertDescription className="flex items-center justify-between w-full">
                        <div className="ml-2">
                            <p className="text-blue-200 font-bold text-sm">IA Financeira: Sugestões Encontradas</p>
                            <p className="text-blue-400/80 text-xs">Identificamos {suggestions.length} transações que batem perfeitamente entre o extrato e o sistema.</p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSuggestions(true)}
                            className="bg-blue-500/20 border-blue-500/30 text-blue-100 hover:bg-blue-500/30 font-bold"
                        >
                            Ver Sugestões
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Área Principal */}
            {!selectedBankAccountId ? (
                <AppCard className="p-16 text-center bg-muted/10 border-dashed border-2 border-muted/50">
                    <Landmark className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-foreground mb-2">
                        Selecione uma conta bancária
                    </h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        Escolha uma conta bancária no menu acima para carregar o extrato e iniciar o fluxo de conciliação.
                    </p>
                </AppCard>
            ) : isLoadingPending ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AppCard className="p-6">
                        <Skeleton className="h-6 w-32 mb-4" />
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-16 w-full mb-2" />
                        ))}
                    </AppCard>
                    <AppCard className="p-6">
                        <Skeleton className="h-6 w-32 mb-4" />
                        {[1, 2, 3].map(i => (
                            <Skeleton key={i} className="h-16 w-full mb-2" />
                        ))}
                    </AppCard>
                </div>
            ) : (
                <>
                    {/* Ações de Matching Sticky */}
                    {(selectedStatementIds.length > 0 || selectedSystemIds.length > 0) && (
                        <AppCard className="p-4 sticky top-4 z-10 bg-background/80 backdrop-blur-xl border-primary/20 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-muted/50 text-foreground px-3 py-1">
                                            {selectedStatementIds.length}
                                        </Badge>
                                        <span className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">Extrato</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <ArrowRightLeft className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-muted/50 text-foreground px-3 py-1">
                                            {selectedSystemIds.length}
                                        </Badge>
                                        <span className="text-xs font-bold uppercase tracking-tighter text-muted-foreground">Sistema</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedStatementIds([]);
                                            setSelectedSystemIds([]);
                                        }}
                                        className="text-muted-foreground hover:text-foreground font-bold"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleIgnoreSelected}
                                        disabled={selectedStatementIds.length === 0 || ignoreMutation.isPending}
                                        className="gap-2 border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                                    >
                                        <EyeOff className="w-4 h-4" />
                                        Ignorar no Extrato
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleManualMatch}
                                        disabled={
                                            selectedStatementIds.length !== 1 ||
                                            selectedSystemIds.length !== 1 ||
                                            reconcileMutation.isPending
                                        }
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Confirmar Conciliação
                                    </Button>
                                </div>
                            </div>
                        </AppCard>
                    )}

                    {/* Grid de Transações */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                        {/* Coluna: Extrato Bancário */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-foreground">Extrato Bancário</h3>
                                    <Badge className="bg-muted/50 text-muted-foreground hover:bg-muted/50" variant="secondary">
                                        {pendingData?.statement.length || 0} pendentes
                                    </Badge>
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Verdade Absoluta (Banco)</p>
                            </div>

                            {pendingData?.statement && pendingData.statement.length > 0 ? (
                                <div className="space-y-2">
                                    {pendingData.statement.map((item) => (
                                        <AppCard
                                            key={item.id}
                                            className={cn(
                                                "p-4 cursor-pointer transition-all border-l-4",
                                                selectedStatementIds.includes(item.id)
                                                    ? 'ring-1 ring-primary border-l-primary bg-primary/5 shadow-md scale-[1.02]'
                                                    : 'hover:bg-muted/30 border-l-transparent'
                                            )}
                                            onClick={() => handleSelectStatementItem(item.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <Checkbox
                                                    checked={selectedStatementIds.includes(item.id)}
                                                    onCheckedChange={() => handleSelectStatementItem(item.id)}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-foreground truncate">{item.description}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-[11px] font-medium text-muted-foreground">
                                                            {formatDate(item.transaction_date)}
                                                        </p>
                                                        {item.reference_number && (
                                                            <p className="text-[10px] text-muted-foreground/50 border rounded px-1">
                                                                #{item.reference_number}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className={cn(
                                                    "font-black text-base tabular-nums",
                                                    item.amount > 0 ? 'text-emerald-500' : 'text-rose-500'
                                                )}>
                                                    {item.amount > 0 ? '+' : ''}{formatCurrency(item.amount)}
                                                </p>
                                            </div>
                                        </AppCard>
                                    ))}
                                </div>
                            ) : (
                                <AppCard className="p-12 text-center bg-emerald-500/5 border-emerald-500/10">
                                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                    <p className="text-lg font-bold text-emerald-500">Conciliação Concluída!</p>
                                    <p className="text-sm text-emerald-500/70">
                                        Nenhuma transação pendente no extrato desta conta.
                                    </p>
                                </AppCard>
                            )}
                        </div>

                        {/* Coluna: Sistema */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold text-foreground">Sistema (CRM)</h3>
                                    <Badge className="bg-muted/50 text-muted-foreground hover:bg-muted/50" variant="secondary">
                                        {pendingData?.system.length || 0} pendentes
                                    </Badge>
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lançamentos em Aberto</p>
                            </div>

                            {pendingData?.system && pendingData.system.length > 0 ? (
                                <div className="space-y-2">
                                    {pendingData.system.map((item) => (
                                        <AppCard
                                            key={item.id}
                                            className={cn(
                                                "p-4 cursor-pointer transition-all border-l-4",
                                                selectedSystemIds.includes(item.id)
                                                    ? 'ring-1 ring-primary border-l-primary bg-primary/5 shadow-md scale-[1.02]'
                                                    : 'hover:bg-muted/30 border-l-transparent'
                                            )}
                                            onClick={() => handleSelectSystemItem(item.id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <Checkbox
                                                    checked={selectedSystemIds.includes(item.id)}
                                                    onCheckedChange={() => handleSelectSystemItem(item.id)}
                                                    className="data-[state=checked]:bg-primary"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-foreground truncate">{item.description}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-[11px] font-medium text-muted-foreground">
                                                            {formatDate(item.transaction_date)}
                                                        </p>
                                                        <p className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                                                            FIFO Rank
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className={cn(
                                                    "font-black text-base tabular-nums",
                                                    item.amount > 0 ? 'text-emerald-500' : 'text-rose-500'
                                                )}>
                                                    {item.amount > 0 ? '+' : ''}{formatCurrency(item.amount)}
                                                </p>
                                            </div>
                                        </AppCard>
                                    ))}
                                </div>
                            ) : (
                                <AppCard className="p-12 text-center bg-amber-500/5 border-amber-500/10">
                                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                                    <p className="text-lg font-bold text-amber-500">Atenção!</p>
                                    <p className="text-sm text-amber-500/70">
                                        Não existem transações em aberto no sistema para conciliar.
                                    </p>
                                </AppCard>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Modal de Importação */}
            {showImporter && selectedBankAccountId && (
                <StatementImporter
                    bankAccountId={selectedBankAccountId}
                    onClose={() => setShowImporter(false)}
                    onSuccess={() => {
                        setShowImporter(false);
                        refetchPending();
                    }}
                />
            )}

            {/* Modal de Sugestões */}
            {showSuggestions && suggestions && (
                <MatchSuggestions
                    suggestions={suggestions}
                    onClose={() => setShowSuggestions(false)}
                    onApplied={() => {
                        setShowSuggestions(false);
                        refetchPending();
                    }}
                />
            )}
        </div>
    );
}
