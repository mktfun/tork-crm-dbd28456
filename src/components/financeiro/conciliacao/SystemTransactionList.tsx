import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SystemTransaction } from "@/data/mocks/financeiroMocks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "lucide-react";

interface SystemTransactionListProps {
  transactions: SystemTransaction[];
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
    }).format(value);
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
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  selectedIds.includes(transaction.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/20 hover:bg-muted/40'
                } ${transaction.matched ? 'opacity-50' : ''}`}
              >
                <Checkbox
                  checked={selectedIds.includes(transaction.id)}
                  onCheckedChange={() => onSelect(transaction.id)}
                  disabled={transaction.matched}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium truncate">
                      {transaction.description}
                    </p>
                    {transaction.matched && (
                      <Badge variant="default" className="text-xs">
                        Conciliado
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(transaction.date)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {transaction.category}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      transaction.type === 'receita'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.type === 'receita' ? 'Receita' : 'Despesa'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
