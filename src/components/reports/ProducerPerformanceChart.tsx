
import { AppCard } from '@/components/ui/app-card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartInsight } from '@/components/dashboard/charts/ChartInsight';
import { Users } from 'lucide-react';

interface ProducerPerformanceData {
  produtorId: string;
  nome: string;
  totalApolices: number;
  valorTotal: number;
  comissaoTotal: number;
  ticketMedio: number;
}

interface ProducerPerformanceChartProps {
  data: ProducerPerformanceData[];
  insight: string;
}

export function ProducerPerformanceChart({ data, insight }: ProducerPerformanceChartProps) {
  // Tooltip customizado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-lg p-4 shadow-xl">
          <p className="text-foreground font-semibold mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="text-blue-400">
              📊 Volume Total: R$ {data.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-green-400">
              💰 Comissão: R$ {data.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-purple-400">
              📋 Apólices: {data.totalApolices}
            </p>
            <p className="text-orange-400">
              🎯 Ticket Médio: R$ {data.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <AppCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            Performance por Produtor
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">
            Nenhum produtor com atividade no período selecionado
          </p>
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-foreground" />
        <h3 className="text-lg font-semibold text-foreground">
          Performance por Produtor
        </h3>
      </div>

      <div className="h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              type="number"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#4B5563' }}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="nome"
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              axisLine={{ stroke: '#4B5563' }}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="valorTotal"
              fill="#3B82F6"
              radius={[0, 4, 4, 0]}
              name="Volume Total"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ChartInsight icon={Users} text={insight} />
    </AppCard>
  );
}
