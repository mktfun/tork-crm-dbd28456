
import { AppCard } from '@/components/ui/app-card';
import { ChartInsight } from '@/components/dashboard/charts/ChartInsight';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Calendar, AlertTriangle } from 'lucide-react';

interface ExpirationData {
  periodo: string;
  vencendoEm30Dias: number;
  vencendoEm60Dias: number;
  vencendoEm90Dias: number;
  vencidas: number;
}

interface ExpirationCalendarChartProps {
  data: ExpirationData[];
  insight: string;
}

export function ExpirationCalendarChart({ data, insight }: ExpirationCalendarChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-foreground font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-300">
                {entry.name}: {entry.value} apólices
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <AppCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 bg-opacity-20">
          <Calendar className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Calendário de Vencimentos Críticos</h3>
          <p className="text-sm text-slate-400">Timeline dos vencimentos mais importantes</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-80 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">Nenhuma apólice com vencimentos no período</p>
          </div>
        </div>
      ) : (
        <>
          <div className="h-80 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="periodo"
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#9CA3AF' }}
                />
                <Bar
                  dataKey="vencidas"
                  stackId="vencimentos"
                  name="Vencidas"
                  fill="#EF4444"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="vencendoEm30Dias"
                  stackId="vencimentos"
                  name="30 dias"
                  fill="#F59E0B"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="vencendoEm60Dias"
                  stackId="vencimentos"
                  name="60 dias"
                  fill="#10B981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="vencendoEm90Dias"
                  stackId="vencimentos"
                  name="90 dias"
                  fill="#3B82F6"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartInsight
            icon={AlertTriangle}
            text={insight}
          />
        </>
      )}
    </AppCard>
  );
}
