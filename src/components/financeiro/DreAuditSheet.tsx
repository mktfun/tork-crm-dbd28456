import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, ExternalLink, Loader2 } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useDreAudit } from '@/hooks/useFinanceiro';

const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const ORIGIN_MAP: Record<string, string> = {
  bank_statement: 'Extrato Bancário',
  policy: 'Comissão de Apólice',
  legacy_transaction: 'Migração',
  reversal: 'Estorno',
  manual: 'Lançamento Manual',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export interface DreAuditTarget {
  category: string;
  monthIndex: number;
  year: number;
  accountType: 'revenue' | 'expense';
  expectedValue: number;
}

interface DreAuditSheetProps {
  target: DreAuditTarget | null;
  onClose: () => void;
}

export function DreAuditSheet({ target, onClose }: DreAuditSheetProps) {
  const navigate = useNavigate();
  const { data: transactions = [], isLoading } = useDreAudit(
    target?.category ?? '',
    target ? target.monthIndex + 1 : 0,
    target?.year ?? 0,
    { enabled: !!target }
  );

  const total = useMemo(
    () => transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [transactions]
  );

  const isExpense = target?.accountType === 'expense';
  const monthLabel = target ? MONTH_LABELS[target.monthIndex] : '';

  return (
    <Sheet open={!!target} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Auditoria DRE
          </SheetTitle>
          <SheetDescription>
            Transações de <strong>{target?.category}</strong> em{' '}
            <strong>{monthLabel} {target?.year}</strong>
          </SheetDescription>
        </SheetHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Valor no DRE</p>
            <p className={`text-lg font-bold ${isExpense ? 'text-destructive' : 'text-emerald-600'}`}>
              {formatCurrency(target?.expectedValue ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground mb-1">Soma das transações</p>
            <p className={`text-lg font-bold ${Math.abs(total - (target?.expectedValue ?? 0)) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        {Math.abs(total - (target?.expectedValue ?? 0)) >= 0.01 && total > 0 && (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mb-4">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              ⚠️ Diferença de {formatCurrency(Math.abs(total - (target?.expectedValue ?? 0)))} entre o DRE e as transações encontradas.
            </p>
          </div>
        )}

        <Separator className="mb-4" />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma transação encontrada para este período.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-2">{transactions.length} transação(ões)</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs">Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const isPolicy = tx.origin === 'policy' && !!tx.related_entity_id;
                  return (
                    <TableRow
                      key={tx.id}
                      className={isPolicy ? 'cursor-pointer hover:bg-muted' : ''}
                      onClick={isPolicy ? () => navigate(`/dashboard/policies/${tx.related_entity_id}`) : undefined}
                    >
                      <TableCell className="text-xs whitespace-nowrap py-2">
                        {format(new Date(tx.transaction_date), 'dd/MM', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        <div className="max-w-[200px] truncate flex items-center gap-1" title={tx.description}>
                          {tx.description}
                          {isPolicy && <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />}
                        </div>
                      </TableCell>
                      <TableCell className={`text-xs text-right py-2 font-medium tabular-nums ${isExpense ? 'text-destructive' : 'text-emerald-600'}`}>
                        {isExpense && '-'}{formatCurrency(Math.abs(tx.amount))}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {ORIGIN_MAP[tx.origin || 'manual'] || 'Manual'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Separator className="my-3" />
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-semibold">Total</span>
              <span className={`text-sm font-bold tabular-nums ${isExpense ? 'text-destructive' : 'text-emerald-600'}`}>
                {isExpense && '-'}{formatCurrency(total)}
              </span>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
