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
    EyeOff
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
    useReconcileTransactionDirectly,
    useIgnoreEntry,
    useReconciliationDashboard
} from '@/hooks/useReconciliation';
import { StatementImporter } from './StatementImporter';
import { MatchSuggestions } from './MatchSuggestions';

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
    const reconcileDirectlyMutation = useReconcileTransactionDirectly();
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
                        className="gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        Importar Extrato
                    </Button>
                </div>
            </div>

            {/* Seletor de Conta */}
            <AppCard className="p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-foreground mb-2 block">
                            Selecione a conta bancária para conciliar:
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
                                <SelectTrigger className="w-full">
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
                </div>
            </AppCard>

            {/* Dashboard da Conta Selecionada */}
            {selectedAccountDashboard && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <AppCard className="p-4">
                        <p className="text-sm text-muted-foreground">Extrato Importado</p>
                        <p className="text-2xl font-bold text-foreground">
                            {selectedAccountDashboard.statement_entries_count}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            transações
                        </p>
                    </AppCard>

                    <AppCard className="p-4">
                        <p className="text-sm text-muted-foreground">Pendentes</p>
                        <p className="text-2xl font-bold text-amber-400">
                            {selectedAccountDashboard.pending_reconciliation}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            aguardando conciliação
                        </p>
                    </AppCard>

                    <AppCard className="p-4">
                        <p className="text-sm text-muted-foreground">Conciliadas</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            {selectedAccountDashboard.already_matched}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            transações ok
                        </p>
                    </AppCard>

                    <AppCard className="p-4">
                        <p className="text-sm text-muted-foreground">Progresso</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Progress value={reconciliationProgress} className="flex-1" />
                            <span className="text-sm font-medium">{reconciliationProgress}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {selectedAccountDashboard.diff_amount !== 0 && (
                                <span className={selectedAccountDashboard.diff_amount > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                    Diferença: {formatCurrency(selectedAccountDashboard.diff_amount)}
                                </span>
                            )}
                        </p>
                    </AppCard>
                </div>
            )}

            {/* Sugestões Automáticas */}
            {suggestions && suggestions.length > 0 && !showSuggestions && (
                <Alert className="bg-blue-500/10 border-blue-500/30">
                    <Sparkles className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="flex items-center justify-between">
                        <span className="text-blue-300">
                            <strong>{suggestions.length} sugestões</strong> de conciliação automática encontradas!
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSuggestions(true)}
                            className="ml-4"
                        >
                            Ver Sugestões
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Área Principal */}
            {!selectedBankAccountId ? (
                <AppCard className="p-8 text-center">
                    <Landmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        Selecione uma conta
                    </h3>
                    <p className="text-muted-foreground">
                        Escolha uma conta bancária acima para começar a conciliação.
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
                    {/* Ações de Matching */}
                    {(selectedStatementIds.length > 0 || selectedSystemIds.length > 0) && (
                        <AppCard className="p-4 sticky top-0 z-10 bg-background/95 backdrop-blur">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Badge variant="secondary">
                                        {selectedStatementIds.length} do extrato
                                    </Badge>
                                    <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                                    <Badge variant="secondary">
                                        {selectedSystemIds.length} do sistema
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleIgnoreSelected}
                                        disabled={selectedStatementIds.length === 0 || ignoreMutation.isPending}
                                        className="gap-2"
                                    >
                                        <EyeOff className="w-4 h-4" />
                                        Ignorar
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleManualMatch}
                                        disabled={
                                            selectedStatementIds.length !== 1 ||
                                            selectedSystemIds.length !== 1 ||
                                            reconcileMutation.isPending
                                        }
                                        className="gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Conciliar
                                    </Button>
                                </div>
                            </div>
                        </AppCard>
                    )}

                    {/* Grid de Transações */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Coluna: Extrato Bancário */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-foreground">Extrato Bancário</h3>
                                <Badge variant="outline">{pendingData?.statement.length || 0}</Badge>
                            </div>

                            {pendingData?.statement && pendingData.statement.length > 0 ? (
                                <div className="space-y-2">
                                    {pendingData.statement.map((item) => (
                                        <AppCard
                                            key={item.id}
                                            className={`p-3 cursor-pointer transition-all ${selectedStatementIds.includes(item.id)
                                                ? 'ring-2 ring-primary bg-primary/5'
                                                : 'hover:bg-muted/50'
                                                }`}
                                            onClick={() => handleSelectStatementItem(item.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={selectedStatementIds.includes(item.id)}
                                                    onCheckedChange={() => handleSelectStatementItem(item.id)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{item.description}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(item.transaction_date)}
                                                    </p>
                                                </div>
                                                <p className={`font-semibold text-sm ${item.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                                                    }`}>
                                                    {formatCurrency(item.amount)}
                                                </p>
                                            </div>
                                        </AppCard>
                                    ))}
                                </div>
                            ) : (
                                <AppCard className="p-6 text-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma transação pendente no extrato
                                    </p>
                                </AppCard>
                            )}
                        </div>

                        {/* Coluna: Sistema */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-foreground">Transações do Sistema</h3>
                                <Badge variant="outline">{pendingData?.system.length || 0}</Badge>
                            </div>

                            {pendingData?.system && pendingData.system.length > 0 ? (
                                <div className="space-y-2">
                                    {pendingData.system.map((item) => (
                                        <AppCard
                                            key={item.id}
                                            className={`p-3 transition-all ${selectedSystemIds.includes(item.id)
                                                ? 'ring-2 ring-primary bg-primary/5'
                                                : 'hover:bg-muted/50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={selectedSystemIds.includes(item.id)}
                                                    onCheckedChange={() => handleSelectSystemItem(item.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSelectSystemItem(item.id)}>
                                                    <p className="font-medium text-sm truncate">{item.description}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(item.transaction_date)}
                                                    </p>
                                                </div>
                                                <p className={`font-semibold text-sm ${item.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                                                    }`}>
                                                    {formatCurrency(item.amount)}
                                                </p>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        reconcileDirectlyMutation.mutate(item.id);
                                                    }}
                                                    disabled={reconcileDirectlyMutation.isPending}
                                                    className="gap-2 ml-2 flex-shrink-0"
                                                >
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Conciliar
                                                </Button>
                                            </div>
                                        </AppCard>
                                    ))}
                                </div>
                            ) : (
                                <AppCard className="p-6 text-center">
                                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Nenhuma transação pendente no sistema
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
