
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
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} className="backdrop-blur-lg border rounded-lg p-4 shadow-xl">
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
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Performance por Produtor</h3>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            Nenhum produtor com atividade no período selecionado
          </p>
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Performance por Produtor</h3>
        </div>
      </div>

      <div className="h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="nome"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="valorTotal"
              fill="hsl(var(--primary))"
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
