import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    History,
    ArrowUpRight,
    ArrowDownRight,
    CalendarClock,
} from 'lucide-react';

import { GlassCard } from '@/components/ui/glass-card';
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
import { useRecentTransactions } from '@/hooks/useFinanceiro';
import { formatCurrency } from '@/utils/formatCurrency';
import { parseLocalDate } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';

// ============ STATUS BADGES ============

type BadgeStatus = 'confirmed' | 'pending' | 'void' | string;

function getStatusBadge(status: BadgeStatus, isConfirmed: boolean) {
    if (status === 'void') {
        return (
            <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">
                Anulado
            </Badge>
        );
    }

    if (!isConfirmed || status === 'pending') {
        return (
            <Badge variant="outline" className="text-amber-400 border-amber-500/30 bg-amber-500/10 text-[10px]">
                Pendente
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
            Confirmado
        </Badge>
    );
}

// ============ COMPONENT ============

interface RecentTransactionsCardProps {
    onViewDetails: (id: string) => void;
}

export function RecentTransactionsCard({ onViewDetails }: RecentTransactionsCardProps) {
    const { data: transactions = [], isLoading } = useRecentTransactions();
    const recent = transactions.slice(0, 5);

    // --- Loading ---
    if (isLoading) {
        return (
            <GlassCard className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <History className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-semibold text-white">Últimas Movimentações</h3>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
            </GlassCard>
        );
    }

    // --- Empty ---
    if (recent.length === 0) {
        return (
            <GlassCard className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <History className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-semibold text-white">Últimas Movimentações</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <CalendarClock className="w-12 h-12 opacity-40 mb-2" />
                    <p className="text-sm">Nenhuma movimentação recente</p>
                </div>
            </GlassCard>
        );
    }

    // --- Data ---
    return (
        <GlassCard className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <History className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-white">Últimas Movimentações</h3>
            </div>

            {/* Table */}
            <Table>
                <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-muted-foreground w-10">Tipo</TableHead>
                        <TableHead className="text-muted-foreground">Descrição</TableHead>
                        <TableHead className="text-muted-foreground">Data</TableHead>
                        <TableHead className="text-muted-foreground text-right">Valor</TableHead>
                        <TableHead className="text-muted-foreground text-center">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recent.map((tx) => {
                        const isRevenue = tx.total_amount > 0;
                        const txDate = parseLocalDate(String(tx.transaction_date));

                        return (
                            <TableRow
                                key={tx.id}
                                className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => onViewDetails(tx.id)}
                                aria-label={`${isRevenue ? 'Receita' : 'Despesa'}: ${tx.description}, ${formatCurrency(Math.abs(tx.total_amount))}`}
                            >
                                {/* Tipo */}
                                <TableCell className="py-3">
                                    {isRevenue ? (
                                        <ArrowUpRight
                                            className="w-5 h-5 text-emerald-500"
                                            aria-label="Receita"
                                        />
                                    ) : (
                                        <ArrowDownRight
                                            className="w-5 h-5 text-rose-500"
                                            aria-label="Despesa"
                                        />
                                    )}
                                </TableCell>

                                {/* Descrição */}
                                <TableCell className="py-3">
                                    <span className="text-sm font-medium text-foreground truncate block max-w-[200px]" title={tx.description}>
                                        {tx.description}
                                    </span>
                                </TableCell>

                                {/* Data */}
                                <TableCell className="py-3">
                                    <span className="text-xs text-muted-foreground">
                                        {format(txDate, "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                </TableCell>

                                {/* Valor */}
                                <TableCell className="py-3 text-right">
                                    <span
                                        className={cn(
                                            'text-sm font-semibold',
                                            isRevenue ? 'text-emerald-500' : 'text-rose-500'
                                        )}
                                    >
                                        {isRevenue ? '+' : '-'}{formatCurrency(Math.abs(tx.total_amount))}
                                    </span>
                                </TableCell>

                                {/* Status */}
                                <TableCell className="py-3 text-center">
                                    {getStatusBadge(tx.status, tx.is_confirmed)}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </GlassCard>
    );
}
