import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, AlertCircle, Building2, ChevronRight } from "lucide-react";
import { useUpcomingReceivables, UpcomingReceivable } from "@/hooks/useFinanceiro";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface ReceivablesListProps {
  daysAhead?: number;
}

export function ReceivablesList({ daysAhead = 30 }: ReceivablesListProps) {
  const { data: receivables, isLoading, error } = useUpcomingReceivables(daysAhead);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return {
      day: format(date, "dd", { locale: ptBR }),
      month: format(date, "MMM", { locale: ptBR }),
    };
  };

  // Agrupamento por Seguradora (FIFO)
  const groupedReceivables = useMemo(() => {
    if (!receivables) return {};
    
    const groups: Record<string, UpcomingReceivable[]> = {};
    
    receivables.forEach(r => {
      const name = r.entityName || "Outros";
      if (!groups[name]) groups[name] = [];
      groups[name].push(r);
    });

    // Ordenar cada grupo por data de vencimento (FIFO - mais antiga primeiro)
    Object.keys(groups).forEach(name => {
      groups[name].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    });

    return groups;
  }, [receivables]);

  const totalAmount = receivables?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

  if (isLoading) {
    return (
      <Card className="border-none shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Recebíveis (Próximos {daysAhead} dias)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-destructive" />
            <CardTitle className="text-base">Recebíveis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="bg-destructive/5 border-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar recebíveis: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!receivables || receivables.length === 0) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Recebíveis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhum recebível previsto</p>
            <p className="text-xs mt-1">Tudo em dia nos próximos {daysAhead} dias.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm bg-background/40 backdrop-blur-md overflow-hidden">
      <CardHeader className="pb-3 bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base font-bold">Quanto falta receber</CardTitle>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground font-medium">Total Consolidado</p>
            <p className="text-lg font-black text-emerald-600 tabular-nums">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[450px]">
          <Accordion type="multiple" className="w-full px-4 pt-2">
            {Object.entries(groupedReceivables).map(([insurer, items], idx) => {
              const insurerTotal = items.reduce((sum, item) => sum + item.amount, 0);
              
              return (
                <AccordionItem value={`item-${idx}`} key={insurer} className="border-b border-muted/30 last:border-0">
                  <AccordionTrigger className="hover:no-underline py-4 group">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center font-bold text-muted-foreground group-data-[state=open]:bg-primary/10 group-data-[state=open]:text-primary transition-colors">
                          {insurer.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm text-foreground">{insurer}</p>
                          <p className="text-xs text-muted-foreground">{items.length} pendências</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-bold tabular-nums",
                          insurerTotal > 0 ? "text-emerald-600" : "text-muted-foreground"
                        )}>
                          {formatCurrency(insurerTotal)}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pl-12 pb-2">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60 mb-2">
                        Fluxo FIFO (Mais antigas primeiro)
                      </p>
                      {items.map((item) => {
                        const { day, month } = formatDate(item.dueDate);
                        return (
                          <div
                            key={item.transactionId}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors border border-transparent hover:border-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-center min-w-[35px]">
                                <p className="text-xs font-black text-muted-foreground">{day}</p>
                                <p className="text-[9px] uppercase font-bold text-muted-foreground/50">{month}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-foreground/80 truncate max-w-[150px]">
                                  {item.description}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Vence em {item.daysUntilDue} dias
                                </p>
                              </div>
                            </div>
                            <p className="text-xs font-bold tabular-nums text-foreground/70">
                              {formatCurrency(item.amount)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
