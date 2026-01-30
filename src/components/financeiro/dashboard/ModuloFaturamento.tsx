import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, RefreshCw, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BillingData {
  label: string;
  value: string;
  percent: number;
  icon: React.ReactNode;
}

interface StatItemProps {
  label: string;
  value: string;
  percent?: number;
  icon: React.ReactNode;
  isHero?: boolean;
}

const MOCK_DATA: BillingData[] = [
  {
    label: "Faturamento Hoje",
    value: "R$ 12.450,00",
    percent: 15,
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    label: "Novas Vendas",
    value: "R$ 180.000,00",
    percent: 52,
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    label: "Renovações",
    value: "R$ 165.200,00",
    percent: 48,
    icon: <RefreshCw className="h-4 w-4" />,
  },
];

const HERO_DATA = {
  label: "Faturamento Mês",
  value: "R$ 345.200,00",
  percent: 8,
  operations: 142,
};

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

export const ModuloFaturamento = () => {
  return (
    <Card className="h-full bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Faturamento & Vendas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hero Number */}
        <div className="rounded-xl bg-zinc-800/50 p-4">
          <StatItem
            label={HERO_DATA.label}
            value={HERO_DATA.value}
            percent={HERO_DATA.percent}
            icon={<DollarSign className="h-5 w-5" />}
            isHero
          />
          <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5">
              <CreditCard className="h-3 w-3" />
              {HERO_DATA.operations} operações
            </span>
            <span>vs mês anterior</span>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="divide-y divide-zinc-800">
          {MOCK_DATA.map((item, index) => (
            <StatItem
              key={index}
              label={item.label}
              value={item.value}
              percent={item.percent}
              icon={item.icon}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuloFaturamento;
