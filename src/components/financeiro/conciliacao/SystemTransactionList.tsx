import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PendingReconciliationItem } from "@/features/finance/api/useReconciliation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database, Unlink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SystemTransactionListProps {
  transactions: (PendingReconciliationItem & { bank_account_id?: string | null })[];
  selectedIds: string[];
  onSelect: (id: string) => void;
}

export function SystemTransactionList({
  transactions,
  selectedIds,
  onSelect
}: SystemTransactionListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Math.abs(value)); // Always positive for display, sign handled by logic if needed, but here we want - for expense?
    // User asked for negative sign. 
    // If value is already negative (it might be stored as negative in DB for expenses?), let's checking.
    // In DB, expenses are negative in `amount` usually?
    // RPC `create_financial_movement`: expenses are stored as negative in `financial_ledger` but `financial_transactions` amount is usually positive?
    // Wait, `createMovement` logic:
    // Expense: `amount` passed is positive. `financial_ledger` entry for asset is negative.
    // `financial_transactions` amount? usually positive (magnitude).
    // Let's assume `amount` is magnitude.
    // We will apply sign based on type.
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base">Lançamentos do Sistema</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Selecione os lançamentos internos para conciliar
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-2">
            {transactions.map((transaction) => {
              const isExpense = transaction.type === 'expense' || transaction.type === 'despesa';
              const isMatched = transaction.status === 'reconciled' || transaction.status === 'conciliado' || transaction.matched_id;
              const isUnassigned = !transaction.bank_account_id;

              return (
                <div
                  key={transaction.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${selectedIds.includes(transaction.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-muted/20 hover:bg-muted/40'
                    } ${isMatched ? 'opacity-50' : ''}`}
                >
                  <Checkbox
                    checked={selectedIds.includes(transaction.id)}
                    onCheckedChange={() => onSelect(transaction.id)}
                    disabled={!!isMatched}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {transaction.description}
                      </p>
                      {isMatched && (
                        <Badge variant="default" className="text-xs">
                          Conciliado
                        </Badge>
                      )}
                      {isUnassigned && !isMatched && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs gap-1 text-amber-500 border-amber-500/30">
                                <Unlink className="w-3 h-3" />
                                Sem Banco
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Provisão sem conta bancária vinculada</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.transaction_date)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {isExpense ? 'Despesa' : 'Receita'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${isExpense
                          ? 'text-red-600'
                          : 'text-emerald-600'
                        }`}
                    >
                      {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isExpense ? 'Despesa' : 'Receita'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
