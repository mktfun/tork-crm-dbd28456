import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  CalendarClock,
  Info
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
} from "recharts";
import { useProjectedCashFlowKPIs } from "@/hooks/useProjectedCashFlow";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function ModuloFluxoCaixaPreditivo() {
  const { data: projectionData, kpis, isLoading, error } = useProjectedCashFlowKPIs(90);

  // Estado de Carregamento
  if (isLoading) {
    return (
      <Card className="h-full bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-64" />
          </div>
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Estado de Erro
  if (error) {
    return (
      <Card className="h-full bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Fluxo de Caixa Preditivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Falha na conexão</AlertTitle>
            <AlertDescription>
              Não foi possível calcular o fluxo de caixa preditivo. Por favor, tente novamente mais tarde.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Renderização Principal com Dados Reais
  return (
    <Card className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              Fluxo de Caixa Preditivo (90 Dias)
            </CardTitle>
            <CardDescription className="text-zinc-400 text-xs mt-1">
              Projeção baseada em saldo atual + recebíveis confirmados.
            </CardDescription>
          </div>
          
          {/* Badge de Status */}
          <span className={cn(
            "text-xs px-2 py-1 rounded-full border font-medium",
            kpis.daysAtRisk > 0 
              ? 'bg-red-500/10 text-red-400 border-red-500/30' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          )}>
            {kpis.daysAtRisk > 0 
              ? `${kpis.daysAtRisk} dias com risco de caixa` 
              : 'Fluxo Saudável'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Mínimo */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <p className="text-xs text-zinc-400 mb-1">Saldo Mínimo</p>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <span className={cn(
                "text-sm font-semibold",
                kpis.minBalance < 0 ? "text-red-400" : "text-white"
              )}>
                {formatCurrency(kpis.minBalance)}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {kpis.minBalanceDate 
                ? `em ${format(new Date(kpis.minBalanceDate), "dd 'de' MMM", { locale: ptBR })}` 
                : '-'}
            </p>
          </div>

          {/* Entradas Totais */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <p className="text-xs text-zinc-400 mb-1">Entradas Previstas</p>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-400">
                {formatCurrency(kpis.totalInflows)}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Comissões a vencer</p>
          </div>

          {/* Saldo Final */}
          <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
            <p className="text-xs text-zinc-400 mb-1">Saldo em 90 Dias</p>
            <div className="flex items-center gap-1">
              <CalendarClock className="h-4 w-4 text-primary" />
              <span className={cn(
                "text-sm font-semibold",
                kpis.endBalance < 0 ? "text-red-400" : "text-primary"
              )}>
                {formatCurrency(kpis.endBalance)}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Previsão de fechamento</p>
          </div>
        </div>

        {/* Gráfico */}
        <div className="flex-1 min-h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData || []} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="date"
                tickFormatter={(val) => format(new Date(val), "dd/MM")}
                stroke="#71717a"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                hide
                tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#18181b', 
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelFormatter={(label) => format(new Date(label), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                formatter={(value: number) => [formatCurrency(value), 'Saldo Projetado']}
              />
              <Area
                type="monotone"
                dataKey="projected_balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorBalance)"
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Disclaimer */}
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-300/80">
            Esta projeção considera o saldo atual consolidado e as comissões de apólices ativas. Despesas futuras fixas serão adicionadas em breve.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default ModuloFluxoCaixaPreditivo;
