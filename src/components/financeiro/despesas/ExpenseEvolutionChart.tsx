import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, Loader2 } from "lucide-react";
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

interface ExpenseEvolutionChartProps {
    data: CashFlowDataPoint[];
    isLoading?: boolean;
}

export function ExpenseEvolutionChart({ data, isLoading }: ExpenseEvolutionChartProps) {
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
                despesa: item.expense, // Using 'expense' field
            }));
    }, [data]);

    const totalDespesas = useMemo(() => {
        return data.reduce((sum, item) => sum + (item.expense || 0), 0);
    }, [data]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="w-5 h-5" />
                        Evolução de Despesas
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                    Evolução de Despesas
                </CardTitle>
                <CardDescription>
                    Total no período: <span className="font-semibold text-rose-500">{formatCurrency(totalDespesas)}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="date"
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                            className="text-xs"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={formatCurrency}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                            }}
                            formatter={(value: number) => [formatCurrency(value), 'Despesas']}
                        />
                        <Area
                            type="monotone"
                            dataKey="despesa"
                            stroke="#f43f5e"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorDespesa)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
