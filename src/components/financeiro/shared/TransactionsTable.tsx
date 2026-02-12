import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Clock, Lock, ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/tooltip';
import { parseLocalDate } from '@/utils/dateUtils';
import { formatCurrency } from './TransactionKpiCard';

export interface Transaction {
    id: string;
    transaction_date: string | null;
    description: string;
    client_name?: string | null;
    account_name?: string | null;
    amount: number | null;
    total_amount?: number;
    is_confirmed: boolean; // Keeping for compatibility but verified via reconciled
    reconciled?: boolean;
    legacy_status?: string | null;
    related_entity_id?: string | null;
    related_entity_type?: string | null;
    bankName?: string | null;
}

interface TransactionsTableProps {
    transactions: Transaction[];
    isLoading: boolean;
    type: 'receita' | 'despesa';
    onViewDetails: (id: string) => void;
    pageSize?: number;
}

export function TransactionsTable({
    transactions,
    isLoading,
    type,
    onViewDetails,
    pageSize = 10
}: TransactionsTableProps) {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    // Filtrar por termo de busca
    const filteredTransactions = useMemo(() => {
        if (!searchTerm.trim()) return transactions;
        const term = searchTerm.toLowerCase();
        return transactions.filter(tx =>
            tx.description?.toLowerCase().includes(term) ||
            tx.client_name?.toLowerCase().includes(term) ||
            tx.account_name?.toLowerCase().includes(term)
        );
    }, [transactions, searchTerm]);

    // Paginação
    const totalItems = filteredTransactions.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginatedTransactions = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredTransactions.slice(start, start + pageSize);
    }, [filteredTransactions, page, pageSize]);

    // Reset page when search changes
    useMemo(() => {
        setPage(1);
    }, [searchTerm]);

    // Transações selecionáveis logic removed

    const colorClass = type === 'receita' ? 'text-emerald-500' : 'text-rose-500';
    const prefix = type === 'receita' ? '+' : '-';

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                ))}
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por descrição, cliente ou categoria..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Table */}
                {paginatedTransactions.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p>{searchTerm ? 'Nenhuma transação encontrada.' : `Nenhuma ${type} no período.`}</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {/* Checkbox column removed */}
                                <TableHead className="w-24">Data</TableHead>
                                <TableHead className="min-w-[280px]">Descrição</TableHead>
                                <TableHead className="w-32">Banco</TableHead>
                                <TableHead className="w-40">Categoria</TableHead>
                                <TableHead className="w-24">Status</TableHead>
                                <TableHead className="text-right w-32">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTransactions.map((tx) => {
                                const isConfirmed = tx.reconciled ?? tx.is_confirmed;
                                const isSynchronized = tx.legacy_status !== null;
                                const amount = tx.amount ?? tx.total_amount ?? 0;

                                const displayDate = tx.transaction_date
                                    ? format(parseLocalDate(String(tx.transaction_date)), 'dd/MM', { locale: ptBR })
                                    : '-';

                                return (
                                    <TableRow
                                        key={tx.id}
                                        className={cn(
                                            "cursor-pointer hover:bg-muted/50",
                                            isConfirmed && "opacity-60"
                                        )}
                                        onClick={() => onViewDetails(tx.id)}
                                    >
                                        {/* Selection cell removed */}
                                        <TableCell className="font-mono text-sm">
                                            {displayDate}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="whitespace-normal break-words">
                                                        {tx.description}
                                                    </span>
                                                    {isSynchronized && (
                                                        <Badge variant="outline" className="text-xs gap-1 flex-shrink-0">
                                                            <Lock className="w-2.5 h-2.5" />
                                                            Sync
                                                        </Badge>
                                                    )}
                                                </div>
                                                {tx.client_name && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {tx.client_name}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {tx.bankName ? (
                                                <Badge variant="secondary" className="text-xs truncate max-w-[120px]">
                                                    {tx.bankName}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/50 italic">
                                                    Sem vínculo
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {tx.account_name && (
                                                <Badge variant="secondary" className="text-xs truncate max-w-[120px]">
                                                    {tx.account_name}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isConfirmed ? (
                                                <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 gap-1">
                                                    <Check className="w-3 h-3" />
                                                    Confirmado
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-amber-600 border-amber-500/30 gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Pendente
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className={cn("text-right font-semibold", colorClass)}>
                                            {prefix}{formatCurrency(Math.abs(amount))}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}

                {/* Pagination */}
                {totalItems > pageSize && (
                    <div className="flex items-center justify-between pt-4 border-t">
                        <span className="text-sm text-muted-foreground">
                            Mostrando {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalItems)} de {totalItems}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm">
                                Página {page} de {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}
