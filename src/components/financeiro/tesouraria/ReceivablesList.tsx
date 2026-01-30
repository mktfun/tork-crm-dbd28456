import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "lucide-react";
import { Receivable } from "@/data/mocks/financeiroMocks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReceivablesListProps {
  receivables: Receivable[];
  totalAmount: number;
}

export function ReceivablesList({ receivables, totalAmount }: ReceivablesListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      day: format(date, "dd", { locale: ptBR }),
      month: format(date, "MMM", { locale: ptBR }),
    };
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base">Recebíveis (Próximos 30 dias)</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {receivables.map((receivable) => {
              const { day, month } = formatDate(receivable.date);
              return (
                <div
                  key={receivable.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-2 min-w-[50px]">
                    <span className="text-2xl font-bold text-primary">{day}</span>
                    <span className="text-xs text-muted-foreground uppercase">{month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{receivable.entity}</p>
                    <p className="text-xs text-muted-foreground">
                      Em {receivable.daysUntilDue} {receivable.daysUntilDue === 1 ? 'dia' : 'dias'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">
                      {formatCurrency(receivable.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total a Receber</span>
            <span className="text-lg font-bold text-emerald-600">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
