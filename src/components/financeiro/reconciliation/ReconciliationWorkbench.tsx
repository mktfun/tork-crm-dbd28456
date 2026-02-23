import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
    ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle,
    Plus, X, Zap, Wand2, Loader2, Search, Unlink, Landmark
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    ResizablePanelGroup, ResizablePanel, ResizableHandle
} from '@/components/ui/resizable';
import {
    usePendingReconciliation,
    useReconcileManual,
    useReconcilePartial,
    useMatchSuggestions,
    useCreateFromStatement,
    type PendingReconciliationItem,
    type MatchSuggestion,
} from '@/hooks/useReconciliation';
import { useFinancialAccounts } from '@/hooks/useFinanceiro';
import { formatCurrency } from '@/utils/formatCurrency';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { PartialReconciliationModal } from './PartialReconciliationModal';

interface BankAccountOption {
    id: string;
    bankName: string;
}

interface ReconciliationWorkbenchProps {
    bankAccountId: string | null;
    dateRange?: DateRange;
    bankAccounts?: BankAccountOption[];
}

// Compact card for statement/system items
function EntryCard({
    item,
    selected,
    suggested,
    onClick,
    isUnassigned,
}: {
    item: PendingReconciliationItem;
    selected: boolean;
    suggested: boolean;
    onClick: () => void;
    isUnassigned?: boolean;
}) {
    const isRevenue = item.amount >= 0;

    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full text-left p-3 rounded-lg border transition-all duration-150',
                'hover:bg-secondary/50',
                selected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : suggested
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-border bg-card',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
                        {isUnassigned && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500/30 text-amber-500 shrink-0">
                                <Unlink className="w-2.5 h-2.5 mr-0.5" />
                                Sem Banco
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                            {format(new Date(item.transaction_date), 'dd/MM/yyyy')}
                        </span>
                        {item.reference_number && (
                            <span className="text-[10px] text-muted-foreground/70 font-mono">
                                #{item.reference_number}
                            </span>
                        )}
                        {suggested && !selected && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500/50 text-amber-500">
                                <Wand2 className="w-2.5 h-2.5 mr-0.5" />
                                Match
                            </Badge>
                        )}
                    </div>
                </div>
                <span className={cn(
                    'text-sm font-bold shrink-0',
                    isRevenue ? 'text-emerald-400' : 'text-red-400'
                )}>
                    {isRevenue ? '+' : ''}{formatCurrency(item.amount)}
                </span>
            </div>
        </button>
    );
}

// Rich card for system items with policy details
function SystemEntryCard({
    item,
    selected,
    suggested,
    onClick,
    isUnassigned,
}: {
    item: PendingReconciliationItem;
    selected: boolean;
    suggested: boolean;
    onClick: () => void;
    isUnassigned?: boolean;
}) {
    const isRevenue = item.amount >= 0;
    const hasRichData = !!(item.customer_name || item.insurer_name || item.branch_name);
    const displayAmount = item.remaining_amount != null ? Math.abs(item.remaining_amount) : Math.abs(item.amount);

    // Fallback to standard EntryCard if no rich data
    if (!hasRichData) {
        return <EntryCard item={item} selected={selected} suggested={suggested} onClick={onClick} isUnassigned={isUnassigned} />;
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full text-left p-3 rounded-lg border transition-all duration-150',
                'hover:bg-secondary/50',
                selected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : suggested
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-border bg-card',
            )}
        >
            {/* Title row */}
            <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm font-bold text-foreground truncate">
                    {item.customer_name || item.description?.replace(/undefined/g, '').trim() || 'Comissão'}
                </p>
                <span className={cn(
                    'text-sm font-bold shrink-0',
                    isRevenue ? 'text-emerald-400' : 'text-red-400'
                )}>
                    {isRevenue ? '+' : '-'}{formatCurrency(displayAmount)}
                </span>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1 mb-1.5">
                {item.branch_name && (
                    <Badge variant="metallic" className="text-[10px] px-1.5 py-0 h-4">{item.branch_name}</Badge>
                )}
                {item.insurer_name && (
                    <Badge variant="silverOutline" className="text-[10px] px-1.5 py-0 h-4">{item.insurer_name}</Badge>
                )}
                {item.item_name && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">{item.item_name}</Badge>
                )}
                {!item.branch_name && !item.insurer_name && !item.item_name && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                        Comissão Automática
                    </Badge>
                )}
                {isUnassigned && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500/30 text-amber-500 shrink-0">
                        <Unlink className="w-2.5 h-2.5 mr-0.5" />
                        Sem Banco
                    </Badge>
                )}
                {suggested && !selected && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500/50 text-amber-500">
                        <Wand2 className="w-2.5 h-2.5 mr-0.5" />
                        Match
                    </Badge>
                )}
            </div>

            {/* Value breakdown */}
            <div className="flex items-center gap-3 text-[10px] mb-1">
                <span className="text-muted-foreground">
                    Cheio: {formatCurrency(Math.abs(item.total_amount ?? 0))}
                </span>
                <span className="text-emerald-500">
                    Baixado: {formatCurrency(Math.abs(item.paid_amount ?? 0))}
                </span>
                <span className="text-red-400 font-bold">
                    Faltante: {formatCurrency(Math.abs(item.remaining_amount ?? 0))}
                </span>
            </div>

            {/* Date */}
            <span className="text-[10px] text-muted-foreground">
                {format(new Date(item.transaction_date), 'dd/MM/yyyy')}
            </span>
        </button>
    );
}

export function ReconciliationWorkbench({ bankAccountId, dateRange, bankAccounts = [] }: ReconciliationWorkbenchProps) {
    const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([]);
    const [selectedSystemIds, setSelectedSystemIds] = useState<string[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createCategoryId, setCreateCategoryId] = useState('');
    const [bankSearch, setBankSearch] = useState('');
    const [systemSearch, setSystemSearch] = useState('');
    const [showPartialModal, setShowPartialModal] = useState(false);
    const [showUnassigned, setShowUnassigned] = useState(false);

    // On-demand bank selection modal state
    const [showBankModal, setShowBankModal] = useState(false);
    const [selectedBankForMatch, setSelectedBankForMatch] = useState('');

    // Data
    const startDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
    const endDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

    const isConsolidated = !bankAccountId;
    const { data: pendingData, isLoading } = usePendingReconciliation(bankAccountId, startDate, endDate, showUnassigned);
    const { data: suggestions = [] } = useMatchSuggestions(bankAccountId);
    const { data: accounts } = useFinancialAccounts();

    const reconcileManual = useReconcileManual();
    const reconcilePartial = useReconcilePartial();
    const createFromStatement = useCreateFromStatement();

    const statementItems = pendingData?.statement || [];
    const systemItems = pendingData?.system || [];

    // Filter
    const filteredStatement = useMemo(() => {
        if (!bankSearch) return statementItems;
        const q = bankSearch.toLowerCase();
        return statementItems.filter(i => i.description.toLowerCase().includes(q));
    }, [statementItems, bankSearch]);

    const filteredSystem = useMemo(() => {
        if (!systemSearch) return systemItems;
        const q = systemSearch.toLowerCase();
        return systemItems.filter(i => i.description.toLowerCase().includes(q));
    }, [systemItems, systemSearch]);

    // Suggested IDs sets
    const suggestedStatementIds = useMemo(() => new Set(suggestions.map(s => s.statement_entry_id)), [suggestions]);
    const suggestedSystemIds = useMemo(() => new Set(suggestions.map(s => s.system_transaction_id)), [suggestions]);

    // Selection logic
    const toggleStatement = useCallback((id: string) => {
        setSelectedStatementIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, []);

    const toggleSystem = useCallback((id: string) => {
        setSelectedSystemIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    }, []);

    // Computed sums
    const bankSum = useMemo(() =>
        statementItems.filter(i => selectedStatementIds.includes(i.id)).reduce((s, i) => s + i.amount, 0),
        [statementItems, selectedStatementIds]
    );

    const systemSum = useMemo(() =>
        systemItems.filter(i => selectedSystemIds.includes(i.id)).reduce((s, i) => {
            const val = i.remaining_amount != null ? Math.abs(i.remaining_amount) : Math.abs(i.amount);
            const signed = (i.type === 'expense' || i.type === 'despesa') ? -val : val;
            return s + signed;
        }, 0),
        [systemItems, selectedSystemIds]
    );

    const diff = bankSum - systemSum;
    const hasLeftSelection = selectedStatementIds.length > 0;
    const hasRightSelection = selectedSystemIds.length > 0;
    const hasBothSides = hasLeftSelection && hasRightSelection;
    const isPerfectMatch = hasBothSides && Math.abs(diff) < 0.01;
    const isMissingTransaction = hasLeftSelection && !hasRightSelection;

    /**
     * True if any selected System item is a pure manual entry.
     * Manual = related_entity_type is null (not 'policy' and not 'legacy_transaction').
     * Partial reconciliation is only allowed for policy commissions and legacy commissions.
     */
    const hasManualSystemItems = useMemo(() => {
        if (selectedSystemIds.length === 0) return false;
        return selectedSystemIds.some(id => {
            const item = systemItems.find(i => i.id === id);
            if (!item) return false;
            const entityType = item.related_entity_type;
            // Allow partial for policies and legacy commissions, block for manual entries (null)
            return entityType !== 'policy' && entityType !== 'legacy_transaction';
        });
    }, [selectedSystemIds, systemItems]);

    // Determine the target bank for reconciliation
    const getTargetBankId = (): string | null => {
        // If a specific bank is selected (Mode B), use it
        if (bankAccountId) return bankAccountId;

        // Check if any selected statement item has a bank
        const selectedStmts = statementItems.filter(i => selectedStatementIds.includes(i.id));
        const stmtWithBank = selectedStmts.find(i => i.bank_account_id);
        if (stmtWithBank?.bank_account_id) return stmtWithBank.bank_account_id;

        // Check if any selected system item has a bank
        const selectedSys = systemItems.filter(i => selectedSystemIds.includes(i.id));
        const sysWithBank = selectedSys.find(i => i.bank_account_id);
        if (sysWithBank?.bank_account_id) return sysWithBank.bank_account_id;

        return null; // Both sides unassigned
    };

    // Execute reconciliation with a given bankId
    const executeReconcile = async (targetBankId: string) => {
        if (selectedStatementIds.length === 1 && selectedSystemIds.length === 1) {
            await reconcilePartial.mutateAsync({
                statementEntryId: selectedStatementIds[0],
                systemTransactionId: selectedSystemIds[0],
                targetBankId,
            });
        } else {
            for (const stmtId of selectedStatementIds) {
                for (const sysId of selectedSystemIds) {
                    try {
                        await reconcilePartial.mutateAsync({
                            statementEntryId: stmtId,
                            systemTransactionId: sysId,
                            targetBankId,
                        });
                    } catch { /* skip duplicates */ }
                }
            }
        }
        setSelectedStatementIds([]);
        setSelectedSystemIds([]);
    };

    // Reconcile handler (1:1 or N:M via multiple calls)
    const handleReconcile = async () => {
        // If mismatch detected, check if partial is allowed
        if (!isPerfectMatch && hasBothSides) {
            if (hasManualSystemItems) {
                toast.error(
                    'Lançamentos manuais exigem valor exato. Apenas comissões de apólices aceitam baixa parcial.',
                    { duration: 5000 }
                );
                return;
            }
            setShowPartialModal(true);
            return;
        }

        const targetBankId = getTargetBankId();
        if (!targetBankId) {
            // Both sides unassigned -> ask user which bank
            setSelectedBankForMatch('');
            setShowBankModal(true);
            return;
        }

        await executeReconcile(targetBankId);
    };

    const handleBankModalConfirm = async () => {
        if (!selectedBankForMatch) return;
        setShowBankModal(false);
        await executeReconcile(selectedBankForMatch);
    };

    const handlePartialReconcile = async (amount: number) => {
        if (selectedStatementIds.length < 1 || selectedSystemIds.length < 1) return;
        const targetBankId = getTargetBankId();
        if (!targetBankId) {
            // For partial reconcile with no bank, we also need to ask
            setSelectedBankForMatch('');
            setShowBankModal(true);
            return;
        }
        await reconcilePartial.mutateAsync({
            statementEntryId: selectedStatementIds[0],
            systemTransactionId: selectedSystemIds[0],
            amountToReconcile: amount,
            targetBankId,
        });
        setShowPartialModal(false);
        setSelectedStatementIds([]);
        setSelectedSystemIds([]);
    };

    const handleCreateTransaction = async () => {
        if (!createCategoryId || selectedStatementIds.length === 0) return;
        for (const stmtId of selectedStatementIds) {
            try {
                await createFromStatement.mutateAsync({
                    statementEntryId: stmtId,
                    categoryAccountId: createCategoryId,
                });
            } catch { /* skip */ }
        }
        setShowCreateModal(false);
        setCreateCategoryId('');
        setSelectedStatementIds([]);
    };

    const clearSelection = () => {
        setSelectedStatementIds([]);
        setSelectedSystemIds([]);
    };

    // Balance bar totals (when nothing selected, show totals)
    const bankTotal = useMemo(() => statementItems.reduce((s, i) => s + i.amount, 0), [statementItems]);
    const systemTotal = useMemo(() => systemItems.reduce((s, i) => {
        const val = i.remaining_amount != null ? Math.abs(i.remaining_amount) : Math.abs(i.amount);
        const signed = (i.type === 'expense' || i.type === 'despesa') ? -val : val;
        return s + signed;
    }, 0), [systemItems]);
    const displayBankSum = hasLeftSelection ? bankSum : bankTotal;
    const displaySystemSum = hasRightSelection ? systemSum : systemTotal;
    const displayDiff = hasLeftSelection || hasRightSelection ? diff : bankTotal - systemTotal;

    return (
        <div className="space-y-4">
            {/* Consolidated Mode Info Banner */}
            {isConsolidated && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border">
                    <Landmark className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                            Visão Consolidada
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Exibindo itens sem banco vinculado. Ao conciliar, o sistema perguntará o banco de destino.
                        </p>
                    </div>
                </div>
            )}
            {/* Balance Bar */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-muted/50 border border-border">
                <div className="text-left">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Extrato (Banco)</span>
                    <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrency(displayBankSum)}</p>
                    <p className="text-xs text-muted-foreground">
                        {hasLeftSelection
                            ? `${selectedStatementIds.length} selecionados`
                            : `${statementItems.length} pendentes`
                        }
                    </p>
                </div>
                <div className="text-center">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Δ Diferença</span>
                    <p className={cn(
                        'text-xl font-bold font-mono mt-0.5',
                        Math.abs(displayDiff) < 0.01 ? 'text-emerald-400' : 'text-red-400'
                    )}>
                        {formatCurrency(displayDiff)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {Math.abs(displayDiff) < 0.01 ? 'Equilibrado ✓' : 'Divergente'}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sistema (ERP)</span>
                    <p className="text-xl font-bold text-foreground mt-0.5">{formatCurrency(displaySystemSum)}</p>
                    <p className="text-xs text-muted-foreground">
                        {hasRightSelection
                            ? `${selectedSystemIds.length} selecionados`
                            : `${systemItems.length} pendentes`
                        }
                    </p>
                </div>
            </div>

            {/* Split View */}
            <div className="rounded-xl border border-border overflow-hidden bg-card" style={{ height: 'calc(100vh - 520px)', minHeight: 400 }}>
                <ResizablePanelGroup direction="horizontal">
                    {/* Left Panel - Bank Statement */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <div className="flex flex-col h-full">
                            <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs font-semibold">Extrato</Badge>
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Filtrar..."
                                        className="h-7 pl-7 text-xs"
                                        value={bankSearch}
                                        onChange={(e) => setBankSearch(e.target.value)}
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">{filteredStatement.length}</span>
                            </div>
                            <div className="flex-1 overflow-auto p-2 space-y-1.5">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton key={i} className="h-14 w-full rounded-lg" />
                                    ))
                                ) : filteredStatement.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                                        <p>Nenhuma entrada pendente</p>
                                    </div>
                                ) : (
                                    filteredStatement.map(item => (
                                        <EntryCard
                                            key={item.id}
                                            item={item}
                                            selected={selectedStatementIds.includes(item.id)}
                                            suggested={suggestedStatementIds.has(item.id)}
                                            onClick={() => toggleStatement(item.id)}
                                            isUnassigned={!item.bank_account_id}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Right Panel - System Transactions */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <div className="flex flex-col h-full">
                            <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs font-semibold">Sistema</Badge>
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Filtrar..."
                                        className="h-7 pl-7 text-xs"
                                        value={systemSearch}
                                        onChange={(e) => setSystemSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Switch
                                        id="show-unassigned"
                                        checked={showUnassigned}
                                        onCheckedChange={setShowUnassigned}
                                        className="scale-75"
                                    />
                                    <Label htmlFor="show-unassigned" className="text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap">
                                        Sem Banco
                                    </Label>
                                </div>
                                <span className="text-xs text-muted-foreground shrink-0">{filteredSystem.length}</span>
                            </div>
                            <div className="flex-1 overflow-auto p-2 space-y-1.5">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton key={i} className="h-14 w-full rounded-lg" />
                                    ))
                                ) : filteredSystem.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
                                        <p>Nenhuma transação pendente</p>
                                    </div>
                                ) : (
                                    filteredSystem.map(item => (
                                        <SystemEntryCard
                                            key={item.id}
                                            item={item}
                                            selected={selectedSystemIds.includes(item.id)}
                                            suggested={suggestedSystemIds.has(item.id)}
                                            onClick={() => toggleSystem(item.id)}
                                            isUnassigned={!item.bank_account_id}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* Floating Action Bar */}
            <AnimatePresence>
                {(hasLeftSelection || hasRightSelection) && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                    >
                        <div className="flex items-center gap-4 px-6 py-3 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/10">
                            {/* Selection info */}
                            <div className="flex items-center gap-3 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                        {selectedStatementIds.length}
                                    </div>
                                    <span className="text-muted-foreground">banco</span>
                                </div>
                                <span className="text-muted-foreground">×</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                        {selectedSystemIds.length}
                                    </div>
                                    <span className="text-muted-foreground">sistema</span>
                                </div>
                            </div>

                            <div className="h-6 w-px bg-border" />

                            {/* Diff indicator */}
                            {hasBothSides && (
                                <div className={cn(
                                    'text-sm font-mono font-bold',
                                    isPerfectMatch ? 'text-emerald-400' : 'text-red-400'
                                )}>
                                    Δ {formatCurrency(diff)}
                                </div>
                            )}

                            <div className="h-6 w-px bg-border" />

                            {/* Actions */}
                            {isPerfectMatch && (
                                <Button
                                    size="sm"
                                    className="gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={handleReconcile}
                                    disabled={reconcilePartial.isPending}
                                >
                                    {reconcilePartial.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    Conciliar
                                </Button>
                            )}

                            {hasBothSides && !isPerfectMatch && !hasManualSystemItems && (
                                <Button
                                    size="sm"
                                    className="gap-2 font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                                    onClick={() => setShowPartialModal(true)}
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    Baixa Parcial
                                </Button>
                            )}

                            {hasBothSides && !isPerfectMatch && hasManualSystemItems && (
                                <Button
                                    size="sm"
                                    disabled
                                    title="Lançamentos manuais exigem valor exato. Baixa parcial não permitida."
                                    className="gap-2 font-semibold opacity-50 cursor-not-allowed bg-amber-600 text-white"
                                >
                                    <AlertTriangle className="w-4 h-4" />
                                    Valores Divergentes
                                </Button>
                            )}

                            {isMissingTransaction && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-2 font-semibold"
                                    onClick={() => setShowCreateModal(true)}
                                >
                                    <Plus className="w-4 h-4" />
                                    Criar Lançamento
                                </Button>
                            )}

                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={clearSelection}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Transaction Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" />
                            Criar Lançamento do Extrato
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Crie uma transação no sistema a partir da(s) entrada(s) selecionada(s) do extrato.
                        </p>

                        {/* Preview selected entries */}
                        <div className="space-y-2 max-h-40 overflow-auto">
                            {statementItems
                                .filter(i => selectedStatementIds.includes(i.id))
                                .map(item => (
                                    <div key={item.id} className="flex justify-between p-2 bg-muted/50 rounded text-sm border border-border/50">
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{item.description}</p>
                                            <p className="text-xs text-muted-foreground">{item.transaction_date}</p>
                                        </div>
                                        <p className={cn('font-semibold shrink-0 ml-2', item.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                            {formatCurrency(item.amount)}
                                        </p>
                                    </div>
                                ))}
                        </div>

                        {/* Category selector */}
                        <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                                Categoria (obrigatório)
                            </label>
                            <Select value={createCategoryId} onValueChange={setCreateCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a categoria..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {(accounts || []).map((acc: any) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                            {acc.code ? `${acc.code} - ` : ''}{acc.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateTransaction}
                            disabled={!createCategoryId || createFromStatement.isPending}
                            className="gap-2"
                        >
                            {createFromStatement.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            Criar e Conciliar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Partial Reconciliation Modal */}
            <PartialReconciliationModal
                isOpen={showPartialModal}
                onClose={() => setShowPartialModal(false)}
                onConfirm={handlePartialReconcile}
                isLoading={reconcilePartial.isPending}
                statementItem={{
                    description: (statementItems.find(i => i.id === selectedStatementIds[0]))?.description || '',
                    amount: (statementItems.find(i => i.id === selectedStatementIds[0]))?.amount || 0,
                    date: (statementItems.find(i => i.id === selectedStatementIds[0]))?.transaction_date || '',
                }}
                systemItem={{
                    description: (systemItems.find(i => i.id === selectedSystemIds[0]))?.description?.replace(/undefined/g, '').trim() || 'Comissão',
                    totalAmount: Math.abs((systemItems.find(i => i.id === selectedSystemIds[0]))?.total_amount ?? 0),
                    paidAmount: Math.abs((systemItems.find(i => i.id === selectedSystemIds[0]))?.paid_amount ?? 0),
                    remainingAmount: Math.abs((systemItems.find(i => i.id === selectedSystemIds[0]))?.remaining_amount ?? 0),
                    customerName: (systemItems.find(i => i.id === selectedSystemIds[0]))?.customer_name || undefined,
                    branchName: (systemItems.find(i => i.id === selectedSystemIds[0]))?.branch_name || undefined,
                    insurerName: (systemItems.find(i => i.id === selectedSystemIds[0]))?.insurer_name || undefined,
                    itemName: (systemItems.find(i => i.id === selectedSystemIds[0]))?.item_name || undefined,
                }}
            />

            {/* On-Demand Bank Selection Modal */}
            <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-primary" />
                            Para qual banco deseja vincular esta conciliação?
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Ambos os itens não possuem banco vinculado. Selecione o banco de destino:
                        </p>
                        <Select value={selectedBankForMatch} onValueChange={setSelectedBankForMatch}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o banco..." />
                            </SelectTrigger>
                            <SelectContent>
                                {bankAccounts.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.bankName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowBankModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            disabled={!selectedBankForMatch || reconcilePartial.isPending}
                            onClick={handleBankModalConfirm}
                        >
                            {reconcilePartial.isPending ? 'Conciliando...' : 'Vincular e Conciliar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
