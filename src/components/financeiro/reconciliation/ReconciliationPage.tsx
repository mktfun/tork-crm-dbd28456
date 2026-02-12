import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    GitCompare,
    RefreshCw,
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
    type PaginatedStatementItem
} from '@/hooks/useReconciliation';
import { formatCurrency } from '@/utils/formatCurrency';
import { StatementImporter } from './StatementImporter';

const PAGE_SIZE = 20;

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
    const [page, setPage] = useState(1);

    // State for bank selection dialog (late binding)
    const [bankBindingTarget, setBankBindingTarget] = useState<PaginatedStatementItem | null>(null);
    const [selectedBankForBinding, setSelectedBankForBinding] = useState<string>('');

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

    const items = statementData?.items || [];
    const totalCount = statementData?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Mutations
    const reconcileMutation = useReconcileTransactionDirectly();
    const unreconcileMutation = useUnreconcileTransaction();
    const batchReconcileMutation = useReconcileTransactionDirectly();

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

        const count = selectedIds.length;
        for (const id of selectedIds) {
            const item = items.find(i => i.id === id);
            if (item && item.bank_account_id) {
                await batchReconcileMutation.mutateAsync({ transactionId: id });
            }
        }
        setSelectedIds([]);
        toast.success(`${count} transações processadas.`);
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
                        {!isConsolidated && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => setShowImporter(true)}
                            >
                                <Upload className="w-4 h-4" />
                                Importar
                            </Button>
                        )}
                        <Button variant="outline" size="icon" onClick={() => refetch()} title="Atualizar">
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Secondary Filters */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Status:</span>
                            <Tabs value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)} className="w-auto">
                                <TabsList className="bg-white/5 backdrop-blur-md border border-white/10 p-1 rounded-xl h-8">
                                    <TabsTrigger value="todas" className="text-xs px-3 h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Todas</TabsTrigger>
                                    <TabsTrigger value="pendente" className="text-xs px-3 h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Pendentes</TabsTrigger>
                                    <TabsTrigger value="conciliado" className="text-xs px-3 h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Conciliados</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="h-4 w-px bg-border" />

                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Tipo:</span>
                            <Tabs value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)} className="w-auto">
                                <TabsList className="bg-white/5 backdrop-blur-md border border-white/10 p-1 rounded-xl h-8">
                                    <TabsTrigger value="todos" className="text-xs px-3 h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Todos</TabsTrigger>
                                    <TabsTrigger value="receita" className="text-xs px-3 h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Receitas</TabsTrigger>
                                    <TabsTrigger value="despesa" className="text-xs px-3 h-6 data-[state=active]:bg-white/10 data-[state=active]:text-white">Despesas</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        {totalCount} registros encontrados
                    </div>
                </div>
            </AppCard>

            {/* Main Content */}
            <AppCard className="overflow-hidden">
                <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                    {selectedIds.length > 0 ? (
                        <div className="flex items-center gap-2 text-primary font-medium bg-primary/10 px-3 py-1 rounded-full animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4" />
                            {selectedIds.length} selecionados
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarIcon className="w-4 h-4" />
                            <span>Período: {dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy') : ''} - {dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy') : ''}</span>
                        </div>
                    )}

                    {selectedIds.length > 0 && (
                        <Button size="sm" onClick={handleBatchReconcile} disabled={batchReconcileMutation.isPending}>
                            {batchReconcileMutation.isPending ? 'Processando...' : 'Conciliar Selecionados'}
                        </Button>
                    )}
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
                                            {item.status_display === 'Conciliado' ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-xs">
                                                    Conciliado
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none text-xs">
                                                    {item.status_display}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
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
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs gap-1 border-primary/20 hover:bg-primary/5 hover:text-primary"
                                                    onClick={() => handleReconcile(item)}
                                                >
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Conciliar
                                                </Button>
                                            )}
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

            {/* Modal de Importação */}
            {showImporter && selectedBankAccountId && !isConsolidated && (
                <StatementImporter
                    bankAccountId={selectedBankAccountId}
                    onClose={() => setShowImporter(false)}
                    onSuccess={() => {
                        setShowImporter(false);
                        refetch();
                    }}
                />
            )}
        </div>
    );
}
