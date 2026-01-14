
import { useState } from 'react';
import { AppCard } from '@/components/ui/app-card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRange } from 'react-day-picker';
import { ChartInsight } from '@/components/dashboard/charts/ChartInsight';
import { TrendingUp, BarChart3, LineChart as LineChartIcon, Target, Calendar, Percent } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { KpiCard } from '../KpiCard';

interface GrowthData {
  month: string;
  novas: number;
  renovadas: number;
}

interface EnhancedGrowthChartProps {
  data: GrowthData[];
  type?: 'bar' | 'line';
  dateRange?: DateRange;
  insight: string;
}

export function EnhancedGrowthChart({ data, type: initialType = 'bar', dateRange, insight }: EnhancedGrowthChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line'>(initialType);
  const [viewMode, setViewMode] = useState<'absolute' | 'percentage'>('absolute');

  // Calcular métricas
  const totalNovas = data.reduce((sum, item) => sum + item.novas, 0);
  const totalRenovadas = data.reduce((sum, item) => sum + item.renovadas, 0);
  const totalGeral = totalNovas + totalRenovadas;
  const mediaMensal = totalGeral / Math.max(data.length, 1);
  const melhorMes = data.reduce((max, item) => 
    (item.novas + item.renovadas) > (max.novas + max.renovadas) ? item : max, 
    data[0] || { month: '', novas: 0, renovadas: 0 }
  );

  // Calcular crescimento percentual vs mês anterior
  const dataWithGrowth = data.map((item, index) => {
    if (index === 0) return { ...item, crescimento: 0 };
    const anterior = data[index - 1];
    const totalAtual = item.novas + item.renovadas;
    const totalAnterior = anterior.novas + anterior.renovadas;
    const crescimento = totalAnterior > 0 ? ((totalAtual - totalAnterior) / totalAnterior) * 100 : 0;
    return { ...item, crescimento };
  });

  // Transformar dados para visualização percentual
  const dataForPercentage = data.map(item => {
    const total = item.novas + item.renovadas;
    return {
      ...item,
      novas: total > 0 ? (item.novas / total) * 100 : 0,
      renovadas: total > 0 ? (item.renovadas / total) * 100 : 0,
    };
  });

  const currentData = viewMode === 'percentage' ? dataForPercentage : dataWithGrowth;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/95 backdrop-blur-sm p-4 border border-gray-700 rounded-lg shadow-xl">
          <p className="font-semibold text-white mb-3">{label}</p>
          {viewMode === 'percentage' ? (
            <>
              <p className="text-sm text-blue-400 mb-1">
                📊 Novas: {data.novas.toFixed(1)}%
              </p>
              <p className="text-sm text-green-400 mb-1">
                🔄 Renovadas: {data.renovadas.toFixed(1)}%
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-blue-400 mb-1">
                📊 Novas: {payload.find((p: any) => p.dataKey === 'novas')?.value || 0} apólices
              </p>
              <p className="text-sm text-green-400 mb-1">
                🔄 Renovadas: {payload.find((p: any) => p.dataKey === 'renovadas')?.value || 0} apólices
              </p>
              {data.crescimento !== undefined && (
                <p className={`text-sm ${data.crescimento >= 0 ? 'text-green-400' : 'text-red-400'} mt-2`}>
                  📈 Crescimento: {data.crescimento >= 0 ? '+' : ''}{data.crescimento.toFixed(1)}%
                </p>
              )}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: currentData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    if (chartType === 'line') {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.8)' }}
            stroke="rgba(255,255,255,0.3)"
          />
          <YAxis 
            tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.8)' }}
            stroke="rgba(255,255,255,0.3)"
            domain={viewMode === 'percentage' ? [0, 100] : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }} />
          <Line 
            type="monotone" 
            dataKey="novas" 
            stroke="#3b82f6" 
            name="Novas Apólices"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="renovadas" 
            stroke="#10b981" 
            name="Apólices Renovadas"
            strokeWidth={3}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      );
    }

    return (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.8)' }}
          stroke="rgba(255,255,255,0.3)"
        />
        <YAxis 
          tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.8)' }}
          stroke="rgba(255,255,255,0.3)"
          domain={viewMode === 'percentage' ? [0, 100] : undefined}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }} />
        <Bar 
          dataKey="novas" 
          fill="#3b82f6" 
          name="Novas Apólices"
          radius={[2, 2, 0, 0]}
        />
        <Bar 
          dataKey="renovadas" 
          fill="#10b981" 
          name="Apólices Renovadas"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    );
  };

  return (
    <AppCard className="p-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">
          Evolução da Carteira - Análise Detalhada
        </h3>
        
        <div className="flex items-center gap-3">
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as 'absolute' | 'percentage')}
            className="bg-gray-800/50 border border-gray-700"
          >
            <ToggleGroupItem 
              value="absolute" 
              aria-label="Valores absolutos"
              className="data-[state=on]:bg-blue-600 data-[state=on]:text-white"
            >
              <Target className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="percentage" 
              aria-label="Visualização percentual"
              className="data-[state=on]:bg-blue-600 data-[state=on]:text-white"
            >
              <Percent className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          <ToggleGroup 
            type="single" 
            value={chartType} 
            onValueChange={(value) => value && setChartType(value as 'bar' | 'line')}
            className="bg-gray-800/50 border border-gray-700"
          >
            <ToggleGroupItem 
              value="bar" 
              aria-label="Visualização em barras"
              className="data-[state=on]:bg-blue-600 data-[state=on]:text-white"
            >
              <BarChart3 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem 
              value="line" 
              aria-label="Visualização em linhas"
              className="data-[state=on]:bg-blue-600 data-[state=on]:text-white"
            >
              <LineChartIcon className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          title="Total de Apólices"
          value={totalGeral.toLocaleString('pt-BR')}
          subtitle={`${totalNovas} novas + ${totalRenovadas} renovadas`}
          icon={Target}
          trend={totalNovas > totalRenovadas ? 'up' : totalRenovadas > totalNovas ? 'neutral' : 'neutral'}
          trendValue={`${((totalNovas / totalGeral) * 100).toFixed(0)}% novas`}
        />
        
        <KpiCard
          title="Média Mensal"
          value={mediaMensal.toFixed(0)}
          subtitle="apólices/mês"
          icon={Calendar}
          trend="neutral"
          trendValue={`${data.length} período${data.length > 1 ? 's' : ''}`}
        />
        
        <KpiCard
          title="Melhor Período"
          value={melhorMes ? (melhorMes.novas + melhorMes.renovadas).toLocaleString('pt-BR') : '0'}
          subtitle={melhorMes?.month || 'N/A'}
          icon={TrendingUp}
          trend="up"
          trendValue="Recorde"
        />
      </div>
      
      {/* Gráfico */}
      <div className="h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      <ChartInsight icon={TrendingUp} text={insight} />
    </AppCard>
  );
}
