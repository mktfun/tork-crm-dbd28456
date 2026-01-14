
import { AppCard } from '@/components/ui/app-card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartInsight } from '@/components/dashboard/charts/ChartInsight';
import { Users, Trophy, Target, DollarSign } from 'lucide-react';
import { KpiCard } from '../KpiCard';
import { ProgressBar } from '../ProgressBar';
import { AlertBadge } from '../AlertBadge';

interface ProducerPerformanceData {
  produtorId: string;
  nome: string;
  totalApolices: number;
  valorTotal: number;
  comissaoTotal: number;
  ticketMedio: number;
}

interface EnhancedProducerPerformanceChartProps {
  data: ProducerPerformanceData[];
  insight: string;
}

export function EnhancedProducerPerformanceChart({ data, insight }: EnhancedProducerPerformanceChartProps) {
  // Calcular métricas
  const totalGeral = data.reduce((sum, p) => sum + p.valorTotal, 0);
  const totalComissoes = data.reduce((sum, p) => sum + p.comissaoTotal, 0);
  const mediaTicket = data.length > 0 ? data.reduce((sum, p) => sum + p.ticketMedio, 0) / data.length : 0;
  const topPerformer = data[0];

  // Calcular metas fictícias (30% acima do valor atual do top performer)
  const metaIndividual = topPerformer ? topPerformer.valorTotal * 1.3 : 100000;

  // Adicionar rankings e badges
  const dataWithRankings = data.map((producer, index) => ({
    ...producer,
    ranking: index + 1,
    badge: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '',
    progressoMeta: (producer.valorTotal / metaIndividual) * 100,
    statusPerformance: producer.valorTotal >= metaIndividual * 0.8 ? 'Excelente' :
                     producer.valorTotal >= metaIndividual * 0.6 ? 'Bom' : 'Atenção'
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-lg p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{data.badge}</span>
            <p className="text-white font-semibold">{label}</p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Ranking:</span>
              <span className="text-white font-medium">#{data.ranking}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-400">Volume Total:</span>
              <span className="text-blue-300">R$ {data.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">Comissão:</span>
              <span className="text-green-300">R$ {data.comissaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">Apólices:</span>
              <span className="text-purple-300">{data.totalApolices}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-400">Ticket Médio:</span>
              <span className="text-orange-300">R$ {data.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-600">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Progresso da Meta:</span>
                <span className={`font-medium ${
                  data.progressoMeta >= 80 ? 'text-green-400' : 
                  data.progressoMeta >= 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {data.progressoMeta.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1">
                <ProgressBar 
                  value={data.valorTotal} 
                  max={metaIndividual} 
                  size="sm"
                  color={data.progressoMeta >= 80 ? 'green' : data.progressoMeta >= 60 ? 'amber' : 'red'}
                  showPercentage={false}
                />
              </div>
            </div>
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
          <Users className="w-5 h-5 text-white" />
          <h3 className="text-lg font-semibold text-white">
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-white" />
          <h3 className="text-lg font-semibold text-white">
            Ranking de Performance - Produtores
          </h3>
        </div>
        
        <div className="flex gap-2">
          <AlertBadge 
            type="success" 
            text="Top Performer" 
            count={1}
          />
          <AlertBadge 
            type="warning" 
            text="Necessita Atenção" 
            count={dataWithRankings.filter(p => p.statusPerformance === 'Atenção').length}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          title="Volume Total"
          value={`R$ ${(totalGeral / 1000).toFixed(0)}k`}
          subtitle={`${data.length} produtores ativos`}
          icon={DollarSign}
          trend="up"
          trendValue={`R$ ${(totalGeral / data.length / 1000).toFixed(0)}k/prod`}
        />
        
        <KpiCard
          title="Comissões Totais"
          value={`R$ ${(totalComissoes / 1000).toFixed(0)}k`}
          subtitle="Total do período"
          icon={Target}
          trend="up"
          trendValue={`${((totalComissoes / totalGeral) * 100).toFixed(1)}% do volume`}
        />
        
        <KpiCard
          title="Ticket Médio Geral"
          value={`R$ ${(mediaTicket / 1000).toFixed(0)}k`}
          subtitle="Média entre produtores"
          icon={Trophy}
          trend="neutral"
          trendValue="Benchmarks"
        />
      </div>

      {/* Top Performer Highlight */}
      {topPerformer && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <p className="text-yellow-400 font-bold text-lg">{topPerformer.nome}</p>
                <p className="text-yellow-300 text-sm">Líder em Performance</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">
                R$ {(topPerformer.valorTotal / 1000).toFixed(0)}k
              </p>
              <p className="text-yellow-400 text-sm">
                {((topPerformer.valorTotal / totalGeral) * 100).toFixed(0)}% do volume total
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Gráfico */}
      <div className="h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dataWithRankings}
            layout="horizontal" 
            margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
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
              width={110}
              tickFormatter={(value, index) => {
                const producer = dataWithRankings[index];
                return `${producer?.badge} ${value}`;
              }}
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

      {/* Progress Bars para Metas */}
      <div className="space-y-3 mb-4">
        <h4 className="text-sm font-medium text-white mb-2">Progresso das Metas</h4>
        {dataWithRankings.slice(0, 5).map((producer) => (
          <ProgressBar
            key={producer.produtorId}
            label={`${producer.badge} ${producer.nome}`}
            value={producer.valorTotal}
            max={metaIndividual}
            color={producer.progressoMeta >= 80 ? 'green' : producer.progressoMeta >= 60 ? 'amber' : 'red'}
            size="sm"
          />
        ))}
      </div>

      <ChartInsight icon={Users} text={insight} />
    </AppCard>
  );
}
