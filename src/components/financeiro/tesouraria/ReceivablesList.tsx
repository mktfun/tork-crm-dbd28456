import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, AlertCircle } from "lucide-react";
import { useUpcomingReceivables } from "@/hooks/useFinanceiro";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";

interface ReceivablesListProps {
  daysAhead?: number;
}

export function ReceivablesList({ daysAhead = 30 }: ReceivablesListProps) {
  const [period, setPeriod] = useState(daysAhead);
  const { data: receivables, isLoading, error } = useUpcomingReceivables(period);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return {
      day: format(date, "dd", { locale: ptBR }),
      month: format(date, "MMM", { locale: ptBR }),
    };
  };

  const totalAmount = receivables?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

  if (isLoading) {
    return (
      <div className="glass-component p-0 shadow-lg border-border bg-card">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Recebíveis (Próximos {daysAhead} dias)</h3>
          </div>
        </div>
        <div className="p-6 pt-0 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Skeleton className="w-[50px] h-[60px] rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-component p-0 shadow-lg border-border bg-card">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Recebíveis (Próximos {daysAhead} dias)</h3>
          </div>
        </div>
        <div className="p-6 pt-0">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Erro ao carregar recebíveis: {error.message}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!receivables || receivables.length === 0) {
    return (
      <div className="glass-component p-0 shadow-lg border-border bg-card">
        <div className="flex flex-col space-y-1.5 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Recebíveis (Próximos {daysAhead} dias)</h3>
          </div>
        </div>
        <div className="p-6 pt-0">
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum recebível previsto</p>
            <p className="text-xs mt-1">Não há receitas a receber nos próximos {daysAhead} dias.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-component p-0 shadow-lg border-border bg-card">
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Recebíveis</h3>
          </div>
          <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
            <SelectTrigger className="w-[140px] bg-transparent border-border text-xs h-8">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Próximos 7 dias</SelectItem>
              <SelectItem value="30">Próximos 30 dias</SelectItem>
              <SelectItem value="90">Próximos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="p-6 pt-0">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {receivables.map((receivable) => {
              const { day, month } = formatDate(receivable.dueDate);
              return (
                <div key={receivable.transactionId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-2 min-w-[50px]">
                    <span className="text-2xl font-bold text-primary">{day}</span>
                    <span className="text-xs text-muted-foreground uppercase">{month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={receivable.entityName}>{receivable.entityName}</p>
                    <p className="text-xs text-muted-foreground truncate" title={receivable.description}>{receivable.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Em {receivable.daysUntilDue} {receivable.daysUntilDue === 1 ? 'dia' : 'dias'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">{formatCurrency(Number(receivable.amount))}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total a Receber</span>
            <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
