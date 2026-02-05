import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, RefreshCw, BarChart3, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinancialSummary } from "@/hooks/useFinanceiro";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface StatItemProps {
  label: string;
  value: string;
  percent?: number;
  icon: React.ReactNode;
  isHero?: boolean;
}

const StatItem = ({ label, value, percent, icon, isHero = false }: StatItemProps) => {
  const isPositive = percent !== undefined && percent >= 0;

  return (
    <div className={cn(
      "flex items-center justify-between py-2",
      isHero && "py-4"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center rounded-lg",
          isHero ? "h-10 w-10 bg-primary/20 text-primary" : "h-8 w-8 bg-zinc-800 text-zinc-400"
        )}>
          {icon}
        </div>
        <div>
          <p className={cn(
            "text-zinc-400",
            isHero ? "text-sm" : "text-xs"
          )}>
            {label}
          </p>
          <p className={cn(
            "font-semibold text-white",
            isHero ? "text-2xl" : "text-base"
          )}>
            {value}
          </p>
        </div>
      </div>

      {percent !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium",
          isPositive ? "text-emerald-500" : "text-rose-500"
        )}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{isPositive ? "+" : ""}{percent}%</span>
        </div>
      )}
    </div>
  );
};

interface ModuloFaturamentoProps {
  onClick?: () => void;
}

export const ModuloFaturamento = ({ onClick }: ModuloFaturamentoProps) => {
  const now = new Date();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: summary, isLoading } = useFinancialSummary(startDate, endDate);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="h-full bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" />
            Faturamento & Vendas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const faturamentoMes = summary?.totalIncome || 0;
  const operacoes = summary?.transactionCount || 0;
  const ticketMedio = operacoes > 0 ? faturamentoMes / operacoes : 0;

  return (
    <Card
      className={cn(
        "h-full bg-zinc-900/50 border-zinc-800 transition-all duration-200",
        onClick && "cursor-pointer hover:bg-zinc-900/70 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Faturamento & Vendas
          </span>
          {onClick && (
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hero Number */}
        <div className="rounded-xl bg-zinc-800/50 p-4">
          <StatItem
            label="Faturamento Mês"
            value={formatCurrency(faturamentoMes)}
            // percent removido pois não tenho dado histórico real fácil aqui
            icon={<DollarSign className="h-5 w-5" />}
            isHero
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5">
              <CreditCard className="h-3 w-3" />
              {operacoes} operações
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 ml-2">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Ticket Médio: {formatCurrency(ticketMedio)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuloFaturamento;
