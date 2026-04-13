import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';

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
    is_confirmed: boolean;
    reconciled: boolean;
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
                        <TableRow className="hover:bg-transparent border-border">
                            <TableHead className="pl-6 w-[120px] text-muted-foreground">Data</TableHead>
                            <TableHead className="w-[120px] text-muted-foreground">Tipo</TableHead>
                            <TableHead className="text-muted-foreground">Descrição</TableHead>
                            <TableHead className="text-muted-foreground">Categoria</TableHead>
                            <TableHead className="text-right text-muted-foreground pr-6">Valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedTransactions.map((tx) => {
                            const isConfirmed = tx.reconciled ?? tx.is_confirmed;
                            const amount = tx.amount ?? tx.total_amount ?? 0;

                            const displayDate = tx.transaction_date
                                ? format(parseLocalDate(String(tx.transaction_date)), 'dd/MM/yyyy', { locale: ptBR })
                                : '-';

                            return (
                                <TableRow
                                    key={tx.id}
                                    className={cn(
                                        "cursor-pointer hover:bg-muted/50 border-border",
                                        isConfirmed && "opacity-60"
                                    )}
                                    onClick={() => onViewDetails(tx.id)}
                                >
                                    <TableCell className="pl-6 font-medium text-muted-foreground">
                                        {displayDate}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            {type === 'receita' ? (
                                                <>
                                                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                                    <span className="text-emerald-500 font-medium text-sm">Entrada</span>
                                                </>
                                            ) : (
                                                <>
                                                    <ArrowDownRight className="w-4 h-4 text-rose-500" />
                                                    <span className="text-rose-500 font-medium text-sm">Saída</span>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-foreground">
                                        {tx.description}
                                    </TableCell>
                                    <TableCell>
                                        {tx.account_name ? (
                                            <Badge variant="outline" className="rounded-full px-3 py-0.5 font-normal text-muted-foreground border-border bg-background">
                                                {tx.account_name}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/50 italic">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-medium pr-6">
                                        <span className={type === 'receita' ? 'text-emerald-500' : 'text-rose-500'}>
                                            {type === 'receita' ? '+' : '-'}
                                            {formatCurrency(Math.abs(amount))}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}

            {/* Pagination */}
            {totalItems > pageSize && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
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
    );
}
