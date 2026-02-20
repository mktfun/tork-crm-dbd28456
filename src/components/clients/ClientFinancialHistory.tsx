import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { DollarSign } from 'lucide-react';
import { Transaction, TransactionType } from '@/types';
import { Link } from 'react-router-dom';
import { formatDate } from '@/utils/dateUtils';

interface ClientFinancialHistoryProps {
  transactions: Transaction[];
  transactionTypes: TransactionType[];
}

export function ClientFinancialHistory({ transactions, transactionTypes }: ClientFinancialHistoryProps) {
  return (
    <AppCard className="p-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <DollarSign size={18} className="text-emerald-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Histórico Financeiro ({transactions.length})
          </h2>
          <p className="text-xs text-muted-foreground">Transações associadas a este cliente</p>
        </div>
      </div>
      
      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <DollarSign size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma transação ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(transaction => {
              const transactionType = transactionTypes.find(t => t.id === transaction.typeId);
              const isGain = transactionType?.nature === 'GANHO';
              return (
                <Link
                  to={`/dashboard/financeiro?transactionId=${transaction.id}`}
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/60 hover:border-border transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{transaction.description}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{formatDate(transaction.date)}</span>
                      {transactionType?.name && (
                        <span className="text-xs text-muted-foreground">{transactionType.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    <p className={`font-bold text-sm ${isGain ? 'text-emerald-500' : 'text-destructive'}`}>
                      {isGain ? '+' : '-'}{transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <Badge variant={transaction.status === 'REALIZADO' ? 'default' : 'outline'} className="text-[10px]">
                      {transaction.status}
                    </Badge>
                  </div>
                </Link>
              );
            })}
        </div>
      )}
    </AppCard>
  );
}
