import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, CalendarClock, Info } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

// Generate realistic 30-day mock data
const generateHistoricData = () => {
  const data = [];
  let saldo = 85000;
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dia = `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    // Realistic fluctuation
    const variation = (Math.random() - 0.45) * 15000;
    saldo = Math.max(40000, Math.min(120000, saldo + variation));

    data.push({
      dia,
      saldo: Math.round(saldo),
    });
  }

  return data;
};

const HISTORIC_DATA = generateHistoricData();

const saldoAtual = HISTORIC_DATA[HISTORIC_DATA.length - 1].saldo;
const maiorSaldo = Math.max(...HISTORIC_DATA.map((d) => d.saldo));
const menorSaldo = Math.min(...HISTORIC_DATA.map((d) => d.saldo));

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
};

interface KpiItemProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
}

const KpiItem = ({ label, value, icon, colorClass }: KpiItemProps) => (
  <div className="text-center">
    <div className="flex items-center justify-center gap-1 mb-1">
      <span className={cn("", colorClass)}>{icon}</span>
      <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
    </div>
    <p className={cn("text-lg font-semibold", colorClass)}>
      {formatCurrencyShort(value)}
    </p>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-primary">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export const ModuloFluxoCaixaPreditivo = () => {
  return (
    <Card className="h-full bg-zinc-900/50 border-zinc-800 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          Fluxo de Caixa (Histórico 30d)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* KPIs Row */}
        <div className="grid grid-cols-3 gap-2 mb-4 pb-3 border-b border-zinc-800">
          <KpiItem
            label="Atual"
            value={saldoAtual}
            icon={<DollarSign className="h-3 w-3" />}
            colorClass="text-primary"
          />
          <KpiItem
            label="Máx"
            value={maiorSaldo}
            icon={<TrendingUp className="h-3 w-3" />}
            colorClass="text-emerald-500"
          />
          <KpiItem
            label="Mín"
            value={menorSaldo}
            icon={<CalendarClock className="h-3 w-3" />}
            colorClass="text-orange-500"
          />
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={HISTORIC_DATA}
              margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="dia"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#71717a", fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis
                hide
                domain={["dataMin - 5000", "dataMax + 5000"]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="saldo"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Disclaimer */}
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
          <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-300/80">
            A projeção preditiva de 90 dias (IA) será ativada na próxima atualização (Sprint 2).
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuloFluxoCaixaPreditivo;
