import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgingReport, useUpcomingReceivables, useFinancialSummary } from "@/hooks/useFinanceiro";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { GlassKpiCard } from "@/components/financeiro/shared/GlassKpiCard";

const AgingBar = ({ item }: { item: any }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{item.bucketRange}</span>
      <span className="text-foreground/80 font-medium">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.bucketAmount)}
      </span>
    </div>
    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all")}
        style={{ width: `${Math.min(100, (item.bucketCount / 10) * 100)}%`, backgroundColor: item.bucketColor }}
      />
    </div>
  </div>
);

interface ModuloTesourariaProps {
  onClick?: () => void;
}

export const ModuloTesouraria = ({ onClick }: ModuloTesourariaProps) => {
  const { data: agingData, isLoading: isLoadingAging } = useAgingReport();
  const { data: upcomingData, isLoading: isLoadingUpcoming } = useUpcomingReceivables(30);

  const now = new Date();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
  const { data: summary, isLoading: isLoadingSummary } = useFinancialSummary(startDate, endDate);

  const isLoading = isLoadingAging || isLoadingUpcoming || isLoadingSummary;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <Card
      className={cn(
        "h-full bg-card/50 border-border transition-all duration-200",
        onClick && "cursor-pointer hover:bg-card/70 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-foreground flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Tesouraria & Contas
          </span>
          {onClick && (
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-[200px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coluna Esquerda: Liquidez */}
            <div className="space-y-4">
              {/* Cards Glass de Saldo */}
              <div className="grid grid-cols-2 gap-3">
                <GlassKpiCard
                  title="A Receber"
                  value={formatCurrency(summary?.current?.operationalPendingIncome || 0)}
                  subtitle="Vencidos + 30 dias"
                  icon={ArrowUpCircle}
                  iconClassName="text-emerald-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]"
                />
                <GlassKpiCard
                  title="A Pagar"
                  value={formatCurrency(summary?.current?.operationalPendingExpense || 0)}
                  subtitle="Vencidos + 30 dias"
                  icon={ArrowDownCircle}
                  iconClassName="text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]"
                />
              </div>

              {/* Próximos Vencimentos */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Próximos Vencimentos
                  </h4>
                </div>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  {upcomingData && upcomingData.length > 0 ? upcomingData.slice(0, 5).map((tx, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-foreground/80 truncate max-w-[120px]" title={tx.description}>
                          {tx.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {format(new Date(tx.dueDate), 'dd/MM', { locale: ptBR })}
                        </span>
                        <span className="font-medium text-emerald-400">
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-muted-foreground py-2 text-center">Nenhum recebimento previsto.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Aging Report */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Inadimplência por Período
              </h4>
              <div className="space-y-3">
                {agingData && agingData.length > 0 ? agingData.map((item, index) => (
                  <AgingBar key={index} item={item} />
                )) : (
                  <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma inadimplência registrada.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuloTesouraria;
