import { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
    ArrowUpCircle,
    ArrowDownCircle,
} from 'lucide-react';
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
    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    });
    const [showImporter, setShowImporter] = useState(false);
    const [page, setPage] = useState(1);

    // State for bank selection dialog (late binding)
    const [bankBindingTarget, setBankBindingTarget] = useState<PaginatedStatementItem | null>(null);
    const [selectedBankForBinding, setSelectedBankForBinding] = useState<string>('');

    const isConsolidated = !selectedBankAccountId || selectedBankAccountId === 'all';

    // Queries
    const { data: bankAccounts, isLoading: isLoadingAccounts } = useBankAccounts();

    const {
        data: statementData,
        isLoading: isLoadingStatement,
        refetch
    } = useBankStatementPaginated(
        selectedBankAccountId,
        format(dateRange.start, 'yyyy-MM-dd'),
        format(dateRange.end, 'yyyy-MM-dd'),
        page,
        PAGE_SIZE
    );

    const items = statementData?.items || [];
    const totalCount = statementData?.totalCount || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Mutations
    const reconcileMutation = useReconcileTransactionDirectly();
    const unreconcileMutation = useUnreconcileTransaction();

    // Handlers
    const handleReconcile = (item: PaginatedStatementItem) => {
        if (!item.bank_account_id) {
            setBankBindingTarget(item);
            setSelectedBankForBinding('');
            return;
        }
        reconcileMutation.mutate({ transactionId: item.id });
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
        setPage(1); // Reset to page 1 on bank change
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
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

                <div className="flex flex-wrap items-center gap-2">
                    {isLoadingAccounts ? (
                        <Skeleton className="h-10 w-[200px]" />
                    ) : (
                        <Select
                            value={selectedBankAccountId || ""}
                            onValueChange={handleBankChange}
                        >
                            <SelectTrigger className="w-[240px]">
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

                    {!isConsolidated && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => setShowImporter(true)}
                        >
                            <Upload className="w-4 h-4" />
                            Importar Extrato
                        </Button>
                    )}

                    <Button variant="outline" size="icon" onClick={() => refetch()} title="Atualizar">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <AppCard className="overflow-hidden">
                <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="w-4 h-4" />
                        <span>
                            {format(dateRange.start, "dd 'de' MMM", { locale: ptBR })} - {format(dateRange.end, "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        {totalCount} movimentações
                    </span>
                </div>

                <div className="relative overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                {isConsolidated && <TableHead>Banco</TableHead>}
                                <TableHead>Tipo</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-center">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingStatement ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
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
                                    <TableCell colSpan={isConsolidated ? 8 : 7} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="w-8 h-8 opacity-50" />
                                            <p>Nenhuma movimentação encontrada neste período.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                                        <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                                            {format(new Date(item.transaction_date), 'dd/MM/yyyy')}
                                        </TableCell>
                                        {isConsolidated && (
                                            <TableCell className="text-sm text-muted-foreground">
                                                {item.bank_name}
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {item.type === 'revenue' ? (
                                                    <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <ArrowDownCircle className="w-4 h-4 text-red-500" />
                                                )}
                                                <span className="text-xs font-medium">
                                                    {item.type === 'revenue' ? 'Receita' : 'Despesa'}
                                                </span>
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
                                        <TableCell className={`text-right font-semibold ${item.type === 'revenue' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {item.type === 'revenue' ? '+' : '-'} {formatCurrency(item.amount)}
                                        </TableCell>
                                        <TableCell>
                                            {item.status_display === 'Conciliado' ? (
                                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-none text-xs">
                                                    Conciliado
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
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
