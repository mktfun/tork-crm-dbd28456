import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Building2, Calendar, TrendingUp } from "lucide-react";
import { AppCard } from "@/components/ui/app-card";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useReceivablesBySeguradora } from "@/hooks/useFinanceiro";

// Paleta de cores para as seguradoras
const COLORS = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#ef4444", // red-500
    "#06b6d4", // cyan-500
    "#f97316", // orange-500
    "#ec4899", // pink-500
    "#84cc16", // lime-500
    "#6366f1", // indigo-500
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
        const d = parseISO(dateStr);
        return isValid(d) ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "—";
    } catch {
        return "—";
    }
};

// Custom tooltip do gráfico de pizza
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
        const { name, value, payload: data } = payload[0];
        return (
            <div className="bg-popover/95 backdrop-blur-sm p-3 border border-border rounded-lg shadow-lg min-w-[180px]">
                <p className="font-semibold text-foreground text-sm mb-1">{name}</p>
                <p className="text-emerald-400 font-bold">{formatCurrency(value)}</p>
                <p className="text-muted-foreground text-xs">{data.qtdTransacoes} transações</p>
                {data.proximaData && (
                    <p className="text-amber-400 text-xs mt-1">
                        Próx. vencimento: {formatDate(data.proximaData)}
                    </p>
                )}
            </div>
        );
    }
    return null;
};

// Custom legend
const renderCustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
        {(payload || []).slice(0, 8).map((entry: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={entry.value}>
                    {entry.value}
                </span>
            </div>
        ))}
    </div>
);

export function ReceivablesBySeguradora() {
    const { data: receivables = [], isLoading, error } = useReceivablesBySeguradora();

    const totalGeral = useMemo(
        () => receivables.reduce((sum, r) => sum + r.totalPendente, 0),
        [receivables]
    );

    // Top 8 para o gráfico; o resto vai em "Outros"
    const chartData = useMemo(() => {
        const top = receivables.slice(0, 8);
        const rest = receivables.slice(8);
        const restTotal = rest.reduce((s, r) => s + r.totalPendente, 0);
        const restQt = rest.reduce((s, r) => s + r.qtdTransacoes, 0);

        const result = top.map((r) => ({
            name: r.seguradora,
            value: r.totalPendente,
            qtdTransacoes: r.qtdTransacoes,
            proximaData: r.proximaData,
        }));

        if (restTotal > 0) {
            result.push({
                name: "Outros",
                value: restTotal,
                qtdTransacoes: restQt,
                proximaData: null,
            });
        }
        return result;
    }, [receivables]);

    if (isLoading) {
        return (
            <AppCard>
                <CardHeader className="pb-3 px-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg font-semibold">A Receber por Seguradora</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Skeleton className="h-56 rounded-xl" />
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                        </div>
                    </div>
                </CardContent>
            </AppCard>
        );
    }

    if (error || receivables.length === 0) {
        return (
            <AppCard>
                <CardHeader className="pb-3 px-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg font-semibold">A Receber por Seguradora</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="px-4 pb-6">
                    <div className="text-center py-8 text-muted-foreground">
                        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Nenhum recebível pendente encontrado</p>
                    </div>
                </CardContent>
            </AppCard>
        );
    }

    return (
        <AppCard>
            <CardHeader className="pb-3 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-foreground">
                                A Receber por Seguradora
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Distribuição de recebíveis pendentes por seguradora
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-emerald-400">{formatCurrency(totalGeral)}</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Gráfico de Pizza */}
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius="38%"
                                    outerRadius="65%"
                                    paddingAngle={2}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {chartData.map((_, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                            className="cursor-pointer hover:opacity-85 transition-opacity"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend content={renderCustomLegend} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Lista de seguradoras com próx. vencimento */}
                    <div className="space-y-2 overflow-y-auto max-h-[280px] pr-1">
                        {receivables.slice(0, 12).map((item, idx) => {
                            const color = COLORS[idx % COLORS.length];
                            const pct = totalGeral > 0 ? (item.totalPendente / totalGeral) * 100 : 0;

                            return (
                                <div
                                    key={item.insuranceCompanyId ?? item.seguradora}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                >
                                    {/* Indicador de cor */}
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: color }}
                                    />

                                    {/* Nome + data */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {item.seguradora}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Calendar className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(item.proximaData)}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="text-xs h-4 px-1.5 border-border bg-transparent font-normal text-muted-foreground"
                                            >
                                                {item.qtdTransacoes}tx
                                            </Badge>
                                        </div>
                                        {/* Barra de progresso */}
                                        <div className="w-full h-1 bg-muted rounded-full mt-1.5">
                                            <div
                                                className="h-1 rounded-full transition-all"
                                                style={{ width: `${pct}%`, backgroundColor: color }}
                                            />
                                        </div>
                                    </div>

                                    {/* Valor + % */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-semibold text-foreground">
                                            {formatCurrency(item.totalPendente)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
                                    </div>
                                </div>
                            );
                        })}

                        {receivables.length > 12 && (
                            <p className="text-xs text-muted-foreground text-center pt-1">
                                +{receivables.length - 12} seguradoras adicionais
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </AppCard>
    );
}
