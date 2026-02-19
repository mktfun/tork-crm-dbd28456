import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GitCompare,
    Calendar as CalendarIcon,
    CheckCircle2,
    Undo2,
    AlertCircle,
    Upload,
    AlertTriangle,
    Landmark,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    X,
    Clock,
    TrendingUp,
    Zap,
    Wand2,
    History,
    Eye,
    FileText,
    UserCheck,
    Sparkles,
    UploadCloud,
} from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { useBankAccounts } from '@/hooks/useBancos';
import {
    useBankStatementPaginated,
    useReconcileTransactionDirectly,
    useUnreconcileTransaction,
    useReconciliationKpis,
    useBulkReconcile,
    useMatchSuggestions,
    useReconcileManual,
    useImportHistory,
    useImportBatchEntries,
    type PaginatedStatementItem,
    type MatchSuggestion,
    type ImportHistoryItem,
    type BankStatementEntry,
} from '@/hooks/useReconciliation';
import { formatCurrency } from '@/utils/formatCurrency';
import { StatementImporter } from './StatementImporter';
import { ReconciliationWorkbench } from './ReconciliationWorkbench';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

// ============ PREMIUM KPI CARD (Glass Design Unificado) ============
import { GlassKpiCard } from '@/components/financeiro/shared/GlassKpiCard';

const variantIconConfig: Record<string, string> = {
    pending: 'text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]',
    reconciled: 'text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]',
    count: 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]',
    progress: 'text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]',
};

interface PremiumKpiProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ElementType;
    variant: 'pending' | 'reconciled' | 'count' | 'progress';
    trend?: { value: number; label: string } | null;
    onClick?: () => void;
    breakdown?: { revenue: number; expense: number } | null;
}

function PremiumKpiCard({ title, value, subtitle, icon: Icon, variant, trend, onClick, breakdown }: PremiumKpiProps) {
    const formatCurrencyShort = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return (
        <AppCard
            onClick={onClick}
            className={cn(
                'flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg border-border bg-card hover:bg-secondary/70',
                onClick && 'cursor-pointer',
            )}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-2xl md:text-3xl font-bold text-foreground break-words">{value}</p>
                    {breakdown && (breakdown.revenue > 0 || breakdown.expense > 0) && (
                        <div className="flex flex-col gap-0.5 mt-1">
                            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" />
                                Receitas: {formatCurrencyShort(breakdown.revenue)}
                            </span>
                            <span className="text-xs font-medium text-rose-400 flex items-center gap-1">
                                <ArrowDownRight className="w-3 h-3" />
                                Despesas: {formatCurrencyShort(breakdown.expense)}
                            </span>
                        </div>
                    )}
                    {trend && trend.value !== 0 && !breakdown && (
                        <p className={cn(
                            'text-xs font-medium flex items-center gap-1',
                            trend.value > 0 ? 'text-emerald-400' : 'text-rose-400'
                        )}>
                            {trend.value > 0 ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trend.value > 0 ? '+' : ''}{trend.value.toFixed(0)}%
                            <span className="text-muted-foreground font-normal ml-0.5">{trend.label || 'vs anterior'}</span>
                        </p>
                    )}
                    {subtitle && !breakdown && (!trend || trend.value === 0) && (
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    )}
                </div>
                <div className="p-2 rounded-lg bg-foreground/10 ml-3 shrink-0">
                    <Icon className={cn('w-5 h-5', variantIconConfig[variant])} />
                </div>
            </div>
        </AppCard>
    );
}

// ============ PROGRESS RING ============
function ReconciliationProgressCard({ progress, reconciledCount, totalCount }: { progress: number; reconciledCount: number; totalCount: number }) {
    const getColor = () => {
        if (progress >= 80) return 'text-emerald-400';
        if (progress >= 50) return 'text-amber-400';
        return 'text-rose-400';
    };

    const getIndicatorColor = () => {
        if (progress >= 80) return 'bg-emerald-500';
        if (progress >= 50) return 'bg-amber-500';
        return 'bg-rose-500';
    };

    const getLabel = () => {
        if (progress >= 80) return 'Excelente';
        if (progress >= 50) return 'Atenção';
        return 'Crítico';
    };

    return (
        <div className={cn(
            'rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-lg shadow-black/20',
            'transition-all duration-300 hover:border-white/20 hover:bg-white/5'
        )}>
            <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2.5 rounded-xl bg-white/5">
                            <TrendingUp className="w-5 h-5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]" />
                        </div>
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Progresso</p>
                            <p className={cn('text-2xl font-bold', getColor())}>{progress.toFixed(0)}%</p>
                        </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                        {getLabel()}
                    </Badge>
                </div>
                <Progress value={progress} className="h-2" indicatorClassName={getIndicatorColor()} />
                <p className="text-xs text-muted-foreground mt-2">
                    {reconciledCount} de {totalCount} conciliados
                </p>
            </div>
        </div>
    );
}

// ============ MAIN PAGE ============

export function ReconciliationPage() {
    // State
    const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    });

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('todas');
    const [typeFilter, setTypeFilter] = useState<string>('todos');

    // Batch Selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const [showImporter, setShowImporter] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importBankId, setImportBankId] = useState<string>('');
    const [viewMode, setViewMode] = useState<'lista' | 'workbench' | 'historico'>('lista');
    const [page, setPage] = useState(1);

    // State for bank selection dialog (late binding)
    const [bankBindingTarget, setBankBindingTarget] = useState<PaginatedStatementItem | null>(null);
    const [selectedBankForBinding, setSelectedBankForBinding] = useState<string>('');
    const [showMatchReview, setShowMatchReview] = useState(false);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [showBankSelectForWorkbench, setShowBankSelectForWorkbench] = useState(false);
    const [pendingWorkbenchBankId, setPendingWorkbenchBankId] = useState<string>('');
    const isConsolidated = !selectedBankAccountId || selectedBankAccountId === 'all';

    // Queries
    const { data: bankAccounts, isLoading: isLoadingAccounts } = useBankAccounts();

    // Debounce search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [statusFilter, typeFilter, dateRange]);

    const {
        data: statementData,
        isLoading: isLoadingStatement,
        refetch
    } = useBankStatementPaginated(
        selectedBankAccountId,
        dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
        dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
        page,
        PAGE_SIZE,
        debouncedSearch,
        statusFilter,
        typeFilter
    );

    // KPIs from dedicated RPC (not paginated)
    const { data: kpisData } = useReconciliationKpis(
        selectedBankAccountId,
        dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        debouncedSearch || undefined
    );

    const items = statementData?.items || [];
    const totalCount = statementData?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const currentKpis = kpisData?.current;
    const previousKpis = kpisData?.previous;

    const kpis = {
        totalPending: currentKpis?.pending_amount || 0,
        totalReconciled: currentKpis?.reconciled_amount || 0,
        countPending: currentKpis?.pending_count || 0,
        totalCount: currentKpis?.total_count || 0,
        reconciledCount: currentKpis?.reconciled_count || 0,
    };

    // Calculate trends
    const calcTrend = (current: number, previous: number) => {
        if (!previous || previous === 0) return null;
        return ((current - previous) / previous) * 100;
    };

    const pendingTrend = calcTrend(kpis.totalPending, previousKpis?.pending_amount || 0);
    const reconciledTrend = calcTrend(kpis.totalReconciled, previousKpis?.reconciled_amount || 0);
    const countTrend = calcTrend(kpis.countPending, previousKpis?.pending_count || 0);

    const progress = useMemo(() => {
        if (kpis.totalCount === 0) return 0;
        return (kpis.reconciledCount / kpis.totalCount) * 100;
    }, [kpis.reconciledCount, kpis.totalCount]);

    // Card click -> filter list
    const handleCardFilter = (status: string) => {
        setStatusFilter(status);
        setPage(1);
    };

    // Import History
    const { data: importHistory = [], isLoading: isLoadingHistory } = useImportHistory(selectedBankAccountId);
    const { data: batchEntries = [], isLoading: isLoadingBatch } = useImportBatchEntries(selectedBatchId);

    // Mutations
    const reconcileMutation = useReconcileTransactionDirectly();
    const unreconcileMutation = useUnreconcileTransaction();
    const bulkReconcileMutation = useBulkReconcile();
    const reconcileManualMutation = useReconcileManual();

    // Match Suggestions
    const { data: matchSuggestions = [], refetch: refetchSuggestions } = useMatchSuggestions(
        isConsolidated ? null : selectedBankAccountId
    );

    // Set of system transaction IDs that have high-confidence matches
    const highConfidenceMatchMap = useMemo(() => {
        const map = new Map<string, MatchSuggestion>();
        matchSuggestions.forEach(s => {
            if (s.confidence >= 0.8) {
                map.set(s.system_transaction_id, s);
            }
        });
        return map;
    }, [matchSuggestions]);

    // Handlers
    const handleReconcile = (item: PaginatedStatementItem) => {
        if (!item.bank_account_id) {
            setBankBindingTarget(item);
            setSelectedBankForBinding('');
            return;
        }
        reconcileMutation.mutate({ transactionId: item.id });
    };

    const handleBatchReconcile = async () => {
        if (selectedIds.length === 0) return;

        // Use bulk RPC if available, falling back to individual calls
        const bankId = !isConsolidated ? selectedBankAccountId : undefined;
        bulkReconcileMutation.mutate(
            { transactionIds: selectedIds, bankAccountId: bankId || undefined },
            { onSuccess: () => setSelectedIds([]) }
        );
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const eligibleIds = items
                .filter(i => !i.reconciled && i.bank_account_id)
                .map(i => i.id);
            setSelectedIds(eligibleIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleConfirmBankBinding = () => {
        if (!bankBindingTarget || !selectedBankForBinding) return;
        reconcileMutation.mutate({
            transactionId: bankBindingTarget.id,
            bankAccountId: selectedBankForBinding
        });
        setBankBindingTarget(null);
        setSelectedBankForBinding('');
    };

    const handleUnreconcile = async (id: string) => {
        await unreconcileMutation.mutateAsync(id);
    };

    const handleBankChange = (value: string) => {
        setSelectedBankAccountId(value);
        setPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <GitCompare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Extrato & Conciliação</h2>
                        <p className="text-sm text-muted-foreground">
                            Visualização detalhada com saldo progressivo e auditoria.
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <AppCard className="p-4 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por descrição..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Date Picker */}
                    <DatePickerWithRange
                        date={dateRange}
                        onDateChange={setDateRange}
                        className="w-[260px]"
                    />

                    {/* Bank Select */}
                    {isLoadingAccounts ? (
                        <Skeleton className="h-10 w-[200px]" />
                    ) : (
                        <Select
                            value={selectedBankAccountId || "all"}
                            onValueChange={handleBankChange}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Selecione o Banco..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Consolidado (Todos)</SelectItem>
                                {bankAccounts?.accounts?.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.bankName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => {
                                setImportBankId('');
                                setShowImportDialog(true);
                            }}
                        >
                            <UploadCloud className="w-4 h-4" />
                            Nova Importação
                        </Button>
                    </div>
                </div>

                {/* Secondary Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <Tabs value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)} className="w-auto">
                                <TabsList className="h-8">
                                    <TabsTrigger value="todas" className="text-xs px-3 h-6">Todas</TabsTrigger>
                                    <TabsTrigger value="pendente" className="text-xs px-3 h-6">Pendentes</TabsTrigger>
                                    <TabsTrigger value="conciliado" className="text-xs px-3 h-6">Conciliados</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="h-4 w-px bg-border" />

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Tipo:</span>
                            <Tabs value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)} className="w-auto">
                                <TabsList className="h-8">
                                    <TabsTrigger value="todos" className="text-xs px-3 h-6">Todos</TabsTrigger>
                                    <TabsTrigger value="receita" className="text-xs px-3 h-6">Receitas</TabsTrigger>
                                    <TabsTrigger value="despesa" className="text-xs px-3 h-6">Despesas</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        {totalCount} registros encontrados
                    </div>
                </div>
            </AppCard>

            {/* Premium KPI Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <PremiumKpiCard
                    title="Total Pendente"
                    value={formatCurrency(kpis.totalPending)}
                    subtitle={`${kpis.countPending} transações`}
                    icon={Clock}
                    variant="pending"
                    trend={pendingTrend !== null ? { value: pendingTrend, label: 'vs período anterior' } : null}
                    onClick={() => handleCardFilter('pendente')}
                    breakdown={{ revenue: currentKpis?.pending_revenue || 0, expense: currentKpis?.pending_expense || 0 }}
                />
                <PremiumKpiCard
                    title="Total Conciliado"
                    value={formatCurrency(kpis.totalReconciled)}
                    subtitle={`${kpis.reconciledCount} transações`}
                    icon={CheckCircle2}
                    variant="reconciled"
                    trend={reconciledTrend !== null ? { value: reconciledTrend, label: 'vs período anterior' } : null}
                    onClick={() => handleCardFilter('conciliado')}
                    breakdown={{ revenue: currentKpis?.reconciled_revenue || 0, expense: currentKpis?.reconciled_expense || 0 }}
                />
                <PremiumKpiCard
                    title="Qtd. Pendentes"
                    value={String(kpis.countPending)}
                    subtitle="aguardando conciliação"
                    icon={AlertCircle}
                    variant="count"
                    trend={countTrend !== null ? { value: countTrend, label: 'vs período anterior' } : null}
                    onClick={() => handleCardFilter('pendente')}
                />
                <ReconciliationProgressCard
                    progress={progress}
                    reconciledCount={kpis.reconciledCount}
                    totalCount={kpis.totalCount}
                />
            </section>

            {/* View Mode Tabs */}
            <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v) => {
                    const newMode = v as 'lista' | 'workbench' | 'historico';
                    if (newMode === 'workbench' && isConsolidated) {
                        setPendingWorkbenchBankId('');
                        setShowBankSelectForWorkbench(true);
                        return;
                    }
                    setViewMode(newMode);
                }} className="w-auto">
                    <TabsList className="h-9">
                        <TabsTrigger value="lista" className="text-sm px-4 h-7 gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            Lista
                        </TabsTrigger>
                        <TabsTrigger
                            value="workbench"
                            className="text-sm px-4 h-7 gap-1.5"
                        >
                            <GitCompare className="w-3.5 h-3.5" />
                            Workbench
                        </TabsTrigger>
                        <TabsTrigger value="historico" className="text-sm px-4 h-7 gap-1.5">
                            <History className="w-3.5 h-3.5" />
                            Histórico
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                {!isConsolidated && matchSuggestions.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 ml-auto"
                        onClick={() => setShowMatchReview(true)}
                    >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Ver Sugestões ({matchSuggestions.length})
                    </Button>
                )}
            </div>

            {/* Historico View */}
            {viewMode === 'historico' ? (
                <AppCard className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <History className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Histórico de Importações</h3>
                    </div>
                    {isLoadingHistory ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : importHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <FileText className="w-10 h-10 mb-3 opacity-50" />
                            <p className="text-sm">Nenhuma importação registrada.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {importHistory.map((item) => {
                                const bankAccount = bankAccounts?.accounts?.find(a => a.id === item.bank_account_id);
                                return (
                                    <div key={item.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className={cn(
                                                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                                                item.status === 'completed' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                                            )}>
                                                {item.status === 'completed' ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                ) : (
                                                    <AlertCircle className="w-5 h-5 text-red-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {item.imported_at ? format(new Date(item.imported_at), 'dd/MM/yyyy HH:mm') : '—'}
                                                    </span>
                                                    {bankAccount && (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            {bankAccount.bankName}
                                                        </Badge>
                                                    )}
                                                    <Badge variant={item.status === 'completed' ? 'secondary' : 'destructive'} className="text-[10px]">
                                                        {item.status === 'completed' ? 'Concluído' : 'Erro'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                    {item.file_name && (
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-3 h-3" />
                                                            {item.file_name}
                                                        </span>
                                                    )}
                                                    {item.auditor_name && (
                                                        <span className="flex items-center gap-1">
                                                            <UserCheck className="w-3 h-3" />
                                                            {item.auditor_name}
                                                        </span>
                                                    )}
                                                    <span>{item.total_transactions || 0} transações</span>
                                                    <span className="font-medium text-foreground">
                                                        {formatCurrency(Number(item.total_amount) || 0)}
                                                    </span>
                                                </div>
                                                {item.error_message && (
                                                    <p className="text-xs text-red-400 mt-1">{item.error_message}</p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="gap-1.5 shrink-0"
                                            onClick={() => setSelectedBatchId(item.id)}
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Ver Detalhes
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </AppCard>
            ) : viewMode === 'workbench' && selectedBankAccountId && !isConsolidated ? (
                <ReconciliationWorkbench
                    bankAccountId={selectedBankAccountId}
                    dateRange={dateRange}
                />
            ) : viewMode === 'workbench' && isConsolidated ? (
                <AppCard className="p-12 flex flex-col items-center justify-center text-center">
                    <Landmark className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">Selecione um banco para iniciar a conciliação.</p>
                    <Button
                        className="mt-4 gap-2"
                        onClick={() => {
                            setPendingWorkbenchBankId('');
                            setShowBankSelectForWorkbench(true);
                        }}
                    >
                        <Landmark className="w-4 h-4" />
                        Selecionar Banco
                    </Button>
                </AppCard>
            ) : (
            <>
            {/* Main Content - List View */}
            <AppCard className="overflow-hidden">
                <div className="p-4 border-b bg-transparent flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Período: {dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : ''} - {dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : ''}</span>
                    </div>
                </div>

                <div className="relative overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-border">
                                <TableHead className="pl-6 w-[40px] text-muted-foreground">
                                    <Checkbox
                                        checked={items.length > 0 && items.every(i => selectedIds.includes(i.id) || i.reconciled || !i.bank_account_id)}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="text-muted-foreground">Data</TableHead>
                                {isConsolidated && <TableHead className="text-muted-foreground">Banco</TableHead>}
                                <TableHead className="text-muted-foreground">Tipo</TableHead>
                                <TableHead className="text-muted-foreground">Descrição</TableHead>
                                <TableHead className="text-muted-foreground">Categoria</TableHead>
                                <TableHead className="text-right text-muted-foreground">Valor</TableHead>
                                <TableHead className="text-muted-foreground">Status</TableHead>
                                <TableHead className="text-center text-muted-foreground pr-6">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingStatement ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        {isConsolidated && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-24 mx-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isConsolidated ? 9 : 8} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="w-8 h-8 opacity-50" />
                                            <p>Nenhuma movimentação encontrada neste período.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/50 border-border transition-colors">
                                        <TableCell className="pl-6">
                                            <Checkbox
                                                checked={selectedIds.includes(item.id)}
                                                onCheckedChange={() => handleToggleSelect(item.id)}
                                                disabled={item.reconciled || !item.bank_account_id}
                                            />
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                                            {format(new Date(item.transaction_date), 'dd/MM/yyyy')}
                                        </TableCell>
                                        {isConsolidated && (
                                            <TableCell className="text-sm text-muted-foreground">
                                                {item.bank_name}
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                {item.type === 'revenue' ? (
                                                    <>
                                                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                                        <span className="text-emerald-500 font-medium text-sm">Receita</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowDownRight className="w-4 h-4 text-rose-500" />
                                                        <span className="text-rose-500 font-medium text-sm">Despesa</span>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium text-foreground truncate max-w-[200px]">
                                                    {item.description}
                                                </span>
                                                {!item.bank_account_id && (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Sem banco vinculado</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {item.category_name}
                                        </TableCell>
                                        <TableCell className={`text-right font-semibold ${item.type === 'revenue' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {item.type === 'revenue' ? '+' : '-'} {formatCurrency(item.amount)}
                                        </TableCell>
                                        <TableCell>
                                            {item.reconciled ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="secondary" className="text-xs cursor-help">
                                                                Conciliado
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Conciliado por: {item.reconciled_by_name || 'Desconhecido'}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">
                                                    Pendente
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {item.reconciled ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                                        onClick={() => handleUnreconcile(item.id)}
                                                        title="Desfazer Conciliação"
                                                    >
                                                        <Undo2 className="w-4 h-4" />
                                                    </Button>
                                                ) : (
                                                    <>
                                                        {highConfidenceMatchMap.has(item.id) && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                                                            onClick={() => {
                                                                                const match = highConfidenceMatchMap.get(item.id)!;
                                                                                reconcileManualMutation.mutate({
                                                                                    statementEntryId: match.statement_entry_id,
                                                                                    systemTransactionId: match.system_transaction_id,
                                                                                });
                                                                            }}
                                                                            title="Match automático encontrado"
                                                                        >
                                                                            <Wand2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Match automático: {highConfidenceMatchMap.get(item.id)?.statement_description}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Confiança: {((highConfidenceMatchMap.get(item.id)?.confidence || 0) * 100).toFixed(0)}%
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1 font-medium"
                                                            onClick={() => handleReconcile(item)}
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Conciliar
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t">
                        <PaginationControls
                            currentPage={page}
                            totalPages={totalPages}
                            totalCount={totalCount}
                            onPageChange={setPage}
                            isLoading={isLoadingStatement}
                        />
                    </div>
                )}
            </AppCard>
            </>
            )}

            {/* ============ FLOATING ACTION BAR ============ */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                    >
                        <div className="flex items-center gap-4 px-6 py-3 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl shadow-primary/10">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                    {selectedIds.length}
                                </div>
                                <span>selecionados</span>
                            </div>

                            <div className="h-6 w-px bg-border" />

                            <Button
                                size="sm"
                                className="gap-2 font-semibold"
                                onClick={handleBatchReconcile}
                                disabled={bulkReconcileMutation.isPending}
                            >
                                <Zap className="w-4 h-4" />
                                {bulkReconcileMutation.isPending
                                    ? 'Processando...'
                                    : `Conciliar ${selectedIds.length}`}
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => setSelectedIds([])}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dialog: Seleção de Banco para Vínculo Tardio */}
            <Dialog open={!!bankBindingTarget} onOpenChange={(open) => !open && setBankBindingTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-primary" />
                            Vincular Conta Bancária
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Esta transação não possui conta bancária vinculada. Selecione o banco para conciliar:
                        </p>
                        {bankBindingTarget && (
                            <div className="p-3 rounded-lg bg-muted/50 border text-sm space-y-1">
                                <p className="font-medium">{bankBindingTarget.description}</p>
                                <p className={bankBindingTarget.type === 'revenue' ? 'text-emerald-600' : 'text-red-600'}>
                                    {bankBindingTarget.type === 'revenue' ? 'Receita' : 'Despesa'}:{' '}
                                    {formatCurrency(bankBindingTarget.amount)}
                                </p>
                            </div>
                        )}
                        <Select value={selectedBankForBinding} onValueChange={setSelectedBankForBinding}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o banco..." />
                            </SelectTrigger>
                            <SelectContent>
                                {bankAccounts?.accounts?.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.bankName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBankBindingTarget(null)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmBankBinding}
                            disabled={!selectedBankForBinding || reconcileMutation.isPending}
                        >
                            {reconcileMutation.isPending ? 'Conciliando...' : 'Vincular e Conciliar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Dialog - Lazy Import (No Bank Required) */}
            <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UploadCloud className="w-5 h-5 text-primary" />
                            Nova Importação de Extrato
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Importe o extrato agora. O vínculo bancário será feito no Workbench ao conciliar.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                setShowImportDialog(false);
                                setShowImporter(true);
                            }}
                        >
                            Importar Arquivo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Importação (Lazy - no bank required) */}
            {showImporter && (
                <StatementImporter
                    bankAccountId={null}
                    onClose={() => setShowImporter(false)}
                    onSuccess={async () => {
                        setShowImporter(false);
                        refetch();
                        // If a bank is selected, go to workbench
                        if (!isConsolidated && selectedBankAccountId) {
                            setViewMode('workbench');
                            const result = await refetchSuggestions();
                            if (result.data && result.data.length > 0) {
                                setShowMatchReview(true);
                            }
                        }
                    }}
                />
            )}

            {/* Match Review Dialog (Post-Import) */}
            <Dialog open={showMatchReview} onOpenChange={setShowMatchReview}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-amber-500" />
                            Correspondências Encontradas
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            Encontramos <span className="font-semibold text-foreground">{matchSuggestions.length}</span> possíveis correspondências entre o extrato importado e as transações do sistema.
                        </p>
                        <div className="max-h-60 overflow-auto space-y-2">
                            {matchSuggestions.slice(0, 10).map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border text-sm">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-foreground truncate">{s.statement_description}</p>
                                        <p className="text-xs text-muted-foreground truncate">↔ {s.system_description}</p>
                                    </div>
                                    <div className="text-right shrink-0 ml-3">
                                        <p className={cn('font-semibold', s.statement_amount >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                                            {formatCurrency(s.statement_amount)}
                                        </p>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {(s.confidence * 100).toFixed(0)}%
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                            {matchSuggestions.length > 10 && (
                                <p className="text-xs text-muted-foreground text-center">
                                    +{matchSuggestions.length - 10} correspondências adicionais
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowMatchReview(false)}>
                            Revisar Manualmente
                        </Button>
                        <Button
                            className="gap-2"
                            onClick={async () => {
                                for (const s of matchSuggestions) {
                                    try {
                                        await reconcileManualMutation.mutateAsync({
                                            statementEntryId: s.statement_entry_id,
                                            systemTransactionId: s.system_transaction_id,
                                        });
                                    } catch { /* skip failed ones */ }
                                }
                                setShowMatchReview(false);
                                toast.success(`${matchSuggestions.length} correspondências processadas!`);
                            }}
                            disabled={reconcileManualMutation.isPending}
                        >
                            <Wand2 className="w-4 h-4" />
                            {reconcileManualMutation.isPending ? 'Processando...' : 'Confirmar Tudo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch Detail Dialog */}
            <Dialog open={!!selectedBatchId} onOpenChange={(open) => !open && setSelectedBatchId(null)}>
                <DialogContent className="sm:max-w-lg max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Detalhes da Importação
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {isLoadingBatch ? (
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                                ))}
                            </div>
                        ) : batchEntries.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma entrada encontrada para este lote.</p>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">{batchEntries.length}</span> transações neste lote
                                </p>
                                <div className="max-h-64 overflow-auto space-y-1.5">
                                    {batchEntries.map((entry) => (
                                        <div key={entry.id} className="flex items-center justify-between p-2.5 bg-muted/50 rounded border border-border/50">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">{entry.description}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{entry.transaction_date}</span>
                                                    <Badge variant={entry.reconciliation_status === 'matched' ? 'secondary' : 'outline'} className="text-[10px]">
                                                        {entry.reconciliation_status === 'matched' ? 'Conciliado' : 'Pendente'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <p className={cn('font-semibold text-sm shrink-0 ml-3', entry.amount >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                                {formatCurrency(entry.amount)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 bg-muted/50 rounded flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total do lote:</span>
                                    <span className="font-bold text-foreground">
                                        {formatCurrency(batchEntries.reduce((s, e) => s + Math.abs(e.amount), 0))}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedBatchId(null)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bank Select for Workbench Dialog */}
            <Dialog
                open={showBankSelectForWorkbench}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowBankSelectForWorkbench(false);
                        // If no bank was selected, stay on current view (don't switch to workbench)
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-primary" />
                            Selecionar Banco para Conciliação
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Selecione a conta bancária que deseja conciliar no Workbench.
                        </p>
                        <Select value={pendingWorkbenchBankId} onValueChange={setPendingWorkbenchBankId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o banco..." />
                            </SelectTrigger>
                            <SelectContent>
                                {bankAccounts?.accounts?.map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                        {account.bankName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowBankSelectForWorkbench(false)}>
                            Cancelar
                        </Button>
                        <Button
                            disabled={!pendingWorkbenchBankId}
                            onClick={() => {
                                setSelectedBankAccountId(pendingWorkbenchBankId);
                                setViewMode('workbench');
                                setShowBankSelectForWorkbench(false);
                            }}
                        >
                            Continuar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
