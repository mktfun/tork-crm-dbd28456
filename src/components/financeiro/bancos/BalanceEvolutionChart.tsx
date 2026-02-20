import { TrendingUp, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AppCard } from "@/components/ui/app-card";

interface BalanceDataPoint {
    date: string;
    balance: number;
}

interface BalanceEvolutionChartProps {
    data: BalanceDataPoint[];
    isLoading?: boolean;
}

export function BalanceEvolutionChart({ data, isLoading }: BalanceEvolutionChartProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2,
        }).format(value);
    };

    const chartData = useMemo(() => {
        return data.map(item => ({
            date: format(new Date(item.date), "dd/MM", { locale: ptBR }),
            balance: Number(item.balance),
            originalDate: item.date
        }));
    }, [data]);

    const currentBalance = useMemo(() => {
        if (data.length === 0) return 0;
        return Number(data[data.length - 1].balance);
    }, [data]);

    if (isLoading) {
        return (
            <AppCard className="p-6 shadow-lg border-border bg-card">
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Evolução do Saldo</h3>
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
                    <h3 className="text-lg font-semibold text-foreground">Evolução do Saldo</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-12">
                    Saldo Atual: <span className="font-semibold text-primary">{formatCurrency(currentBalance)}</span>
                </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}
                        tickFormatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact", maximumFractionDigits: 1 }).format(value)}
                        width={80}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                        labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                </AreaChart>
            </ResponsiveContainer>
        </AppCard>
    );
}
