import { useMemo, useState, useCallback } from 'react';
import { format, addMonths, startOfDay } from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
  BarChart3,
  Calendar,
  Filter,
  TrendingUp,
  TrendingDown,
  Wallet
} from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AppCard } from '@/components/ui/app-card';
import { CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ProjectedCashFlowChart } from './ProjectedCashFlowChart';
import { useProjectedCashFlow } from '@/hooks/useRecurringConfigs';
import { ProjectedCashFlowPoint } from '@/types/recurring';

interface ProvisoesTabProps {
  dateRange?: DateRange; // Mantido para compatibilidade, mas ignorado na lógica principal
}

type GranularityOption = 'day' | 'week' | 'month';

console.log('[ANTIGRAVITY] ProvisoesTab REACTIVE-KPIs v3 LOADED');

export function ProvisoesTab({ dateRange }: ProvisoesTabProps) {
  const [granularity, setGranularity] = useState<GranularityOption>('day');
  const [horizonMonths, setHorizonMonths] = useState(3);

  // KPIs derivados do viewport visível (não do horizonte total)
  const [viewportData, setViewportData] = useState<ProjectedCashFlowPoint[]>([]);

  // Calcular período de projeção sempre a partir de HOJE (Futuro)
  const projectionPeriod = useMemo(() => {
    const start = startOfDay(new Date());
    const end = addMonths(start, horizonMonths);

    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [horizonMonths]);

  const {
    data: projectionData = [],
    isLoading: projectionLoading
  } = useProjectedCashFlow(
    projectionPeriod.startDate,
    projectionPeriod.endDate,
    granularity
  );

  // Callback estável para quando o viewport do gráfico mudar
  const handleViewportChange = useCallback((visible: ProjectedCashFlowPoint[]) => {
    setViewportData(visible);
  }, []);

  // Callback estável para quando o zoom semântico mudar a granularidade
  const handleGranularityChange = useCallback((g: GranularityOption) => {
    setGranularity(g);
  }, []);

  // KPIs calculados sobre os pontos VISÍVEIS no viewport
  const summary = useMemo(() => {
    const source = viewportData.length > 0 ? viewportData : projectionData;
    if (!source.length) return { income: 0, expense: 0, balance: 0 };

    const income = source.reduce((acc, curr) => acc + curr.projected_income + curr.realized_income, 0);
    const expense = source.reduce((acc, curr) => acc + curr.projected_expense + curr.realized_expense, 0);
    const lastPoint = source[source.length - 1];

    return {
      income,
      expense,
      balance: lastPoint?.running_balance || 0
    };
  }, [viewportData, projectionData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Label do período visível para contextualizar os KPIs
  const viewportLabel = viewportData.length > 0
    ? `${viewportData.length} ponto(s) visível(is)`
    : 'horizonte completo';

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Provisões e Projeções
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Análise preditiva do fluxo de caixa considerando receitas futuras e despesas recorrentes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-card p-3 rounded-lg border">
          {/* Controle de Horizonte */}
          <div className="flex items-center gap-2">
            <Label htmlFor="horizon" className="text-sm font-medium flex items-center gap-1.5 min-w-fit">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Horizonte:
            </Label>
            <Select
              value={String(horizonMonths)}
              onValueChange={(v) => {
                const val = Number(v);
                setHorizonMonths(val);
                // Ajuste automático de granularidade para horizontes longos
                if (val >= 6 && granularity === 'day') setGranularity('week');
                if (val >= 12) setGranularity('month');
              }}
            >
              <SelectTrigger id="horizon" className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Mês (Curto)</SelectItem>
                <SelectItem value="2">2 Meses</SelectItem>
                <SelectItem value="3">3 Meses (Trimestre)</SelectItem>
                <SelectItem value="6">6 Meses (Semestre)</SelectItem>
                <SelectItem value="12">12 Meses (Anual)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-8 w-[1px] bg-border hidden sm:block" />

          {/* Controle de Granularidade */}
          <div className="flex items-center gap-2">
            <Label htmlFor="granularity" className="text-sm font-medium flex items-center gap-1.5 min-w-fit">
              <Filter className="w-4 h-4 text-muted-foreground" />
              Agrupar:
            </Label>
            <Tabs value={granularity} onValueChange={(v) => v && setGranularity(v as GranularityOption)} className="w-auto">
              <TabsList className="h-9">
                <TabsTrigger value="day" className="text-xs px-3 h-7">
                  Dia
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3 h-7">
                  Semana
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3 h-7">
                  Mês
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Cards de Resumo — reativos ao viewport visível */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AppCard>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Receita Projetada
            </span>
            <span className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.income)}</span>
            <span className="text-xs text-muted-foreground">{viewportLabel}</span>
          </CardContent>
        </AppCard>
        <AppCard>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="w-4 h-4 text-rose-500" /> Despesa Projetada
            </span>
            <span className="text-2xl font-bold text-rose-600">{formatCurrency(summary.expense)}</span>
            <span className="text-xs text-muted-foreground">{viewportLabel}</span>
          </CardContent>
        </AppCard>
        <AppCard>
          <CardContent className="p-4 flex flex-col gap-1">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Wallet className="w-4 h-4 text-primary" /> Saldo Final Projetado
            </span>
            <span className={`text-2xl font-bold ${summary.balance < 0 ? 'text-rose-600' : 'text-primary'}`}>
              {formatCurrency(summary.balance)}
            </span>
            <span className="text-xs text-muted-foreground">{viewportLabel}</span>
          </CardContent>
        </AppCard>
      </div>

      {/* Gráfico de Ponte de Caixa */}
      <ProjectedCashFlowChart
        data={projectionData}
        isLoading={projectionLoading}
        granularity={granularity}
        onGranularityChange={handleGranularityChange}
        onViewportChange={handleViewportChange}
      />
    </div>
  );
}
