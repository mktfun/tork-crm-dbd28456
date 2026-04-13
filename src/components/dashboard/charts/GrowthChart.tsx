import { useMemo } from 'react';
import { AppCard } from '@/components/ui/app-card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRange } from 'react-day-picker';
import { ChartInsight } from './ChartInsight';
import { TrendingUp } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface GrowthData {
  month: string;
  novas: number;
  renovadas: number;
}

interface GrowthChartProps {
  data: GrowthData[];
  type?: 'bar' | 'line';
  dateRange?: DateRange;
  insight: string;
}

export function GrowthChart({ data, type: chartType = 'bar', dateRange, insight }: GrowthChartProps) {
  const periodType = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 'Mensal';
    const diasDiferenca = differenceInDays(dateRange.to, dateRange.from);
    return diasDiferenca <= 90 ? 'Diário' : 'Mensal';
  }, [dateRange]);

  const hasData = data && data.length > 0;
  const totalData = hasData ? data.reduce((sum, item) => sum + item.novas + item.renovadas, 0) : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} className="backdrop-blur-sm p-3 border rounded-lg shadow-lg">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm text-muted-foreground">
              <span className="font-medium" style={{ color: entry.color }}>
                {entry.dataKey === 'novas' ? 'Novas' : 'Renovadas'}:
              </span> {entry.value} apólices
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonAxisProps = {
      stroke: 'hsl(var(--muted-foreground))',
      fontSize: 12,
      tickLine: false,
      axisLine: false,
    };

    if (chartType === 'line') {
      return (
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '14px' }} formatter={(value) => <span className="text-muted-foreground">{value}</span>} />
          <Line type="monotone" dataKey="novas" stroke="#3b82f6" name="Novas Apólices" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="renovadas" stroke="#10b981" name="Apólices Renovadas" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      );
    }

    return (
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="month" {...commonAxisProps} />
        <YAxis {...commonAxisProps} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '14px' }} formatter={(value) => <span className="text-muted-foreground">{value}</span>} />
        <Bar dataKey="novas" fill="#3b82f6" name="Novas Apólices" radius={[2, 2, 0, 0]} />
        <Bar dataKey="renovadas" fill="#10b981" name="Apólices Renovadas" radius={[2, 2, 0, 0]} />
      </BarChart>
    );
  };

  if (!hasData || totalData === 0) {
    return (
      <AppCard className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Crescimento {periodType} - Novas vs Renovadas</h3>
          </div>
        </div>

        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h4 className="text-lg font-semibold text-foreground mb-2">Nenhum dado encontrado</h4>
            <p className="text-muted-foreground text-sm max-w-md">
              {dateRange?.from && dateRange?.to
                ? 'Não há apólices criadas no período selecionado. Tente selecionar um período diferente.'
                : 'Ainda não há apólices criadas. Comece criando suas primeiras apólices para ver os dados aqui.'
              }
            </p>
          </div>
        </div>

        <ChartInsight icon={TrendingUp} text={insight} />
      </AppCard>
    );
  }

  return (
    <AppCard className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Crescimento {periodType} - Novas vs Renovadas</h3>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      <ChartInsight icon={TrendingUp} text={insight} />
    </AppCard>
  );
}
