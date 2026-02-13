import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, BarChart3, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducaoData } from "@/hooks/useRelatorios";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRange } from "react-day-picker";

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
          isHero ? "h-10 w-10 bg-primary/20 text-primary" : "h-8 w-8 bg-secondary text-muted-foreground"
        )}>
          {icon}
        </div>
        <div>
          <p className={cn(
            "text-muted-foreground",
            isHero ? "text-sm" : "text-xs"
          )}>
            {label}
          </p>
          <p className={cn(
            "font-semibold text-foreground",
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
  dateRange?: DateRange;
}

export const ModuloFaturamento = ({ onClick, dateRange }: ModuloFaturamentoProps) => {
  // Use dateRange if provided, otherwise use current month
  const now = new Date();
  const from = dateRange?.from || startOfMonth(now);
  const to = dateRange?.to || endOfMonth(now);

  const startDate = format(startOfDay(from), 'yyyy-MM-dd');
  const endDate = format(endOfDay(to), 'yyyy-MM-dd');

  const { data: producaoData, isLoading } = useProducaoData(startDate, endDate);

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
      <Card
        className={cn(
          "h-full bg-card/50 border-border transition-all duration-200",
          onClick && "cursor-pointer hover:bg-card/70 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
        )}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-foreground flex items-center gap-2 text-base">
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

  const faturamentoMes = producaoData?.reduce((acc, item) => acc + (item.total_comissao || 0), 0) || 0;
  const totalPremio = producaoData?.reduce((acc, item) => acc + (item.total_premio || 0), 0) || 0;
  const operacoes = producaoData?.reduce((acc, item) => acc + (item.qtd_vendas || 0), 0) || 0;
  const ticketMedio = operacoes > 0 ? totalPremio / operacoes : 0;

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
        <div className="rounded-xl bg-secondary/50 p-4">
          <StatItem
            label="Faturamento Mês"
            value={formatCurrency(faturamentoMes)}
            // percent removed as we don't have real historical data here easily
            icon={<DollarSign className="h-5 w-5" />}
            isHero
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
              <CreditCard className="h-3 w-3" />
              {operacoes} operações
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 ml-2">
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
