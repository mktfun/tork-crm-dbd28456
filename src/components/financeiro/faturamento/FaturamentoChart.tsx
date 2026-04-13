import { TrendingUp, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CashFlowDataPoint } from "@/types/financeiro";
import { AppCard } from "@/components/ui/app-card";

interface FaturamentoChartProps {
  data: CashFlowDataPoint[];
  isLoading?: boolean;
}

export function FaturamentoChart({ data, isLoading }: FaturamentoChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartData = useMemo(() => {
    return data
      .filter(item => item.period && !isNaN(new Date(item.period).getTime()))
      .map(item => ({
        date: format(new Date(item.period), "dd/MM", { locale: ptBR }),
        faturamento: item.income,
      }));
  }, [data]);

  const totalFaturamento = useMemo(() => {
    return data.reduce((sum, item) => sum + (item.income || 0), 0);
  }, [data]);

  if (isLoading) {
    return (
      <AppCard className="p-6 shadow-lg border-border bg-card">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Evolução do Faturamento</h3>
          </div>
        </div>
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className="p-6 shadow-lg border-border bg-card">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Evolução do Faturamento</h3>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Total no período: <span className="font-semibold text-emerald-500">{formatCurrency(totalFaturamento)}</span>
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
              borderRadius: '8px',
              color: 'hsl(var(--foreground))'
            }}
            formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
          />
          <Area
            type="monotone"
            dataKey="faturamento"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorFaturamento)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </AppCard>
  );
}