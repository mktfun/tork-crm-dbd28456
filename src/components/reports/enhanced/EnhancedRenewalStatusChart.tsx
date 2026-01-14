
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AppCard } from '@/components/ui/app-card';
import { ChartInsight } from '@/components/dashboard/charts/ChartInsight';
import { PieChart as PieChartIcon, AlertTriangle, Clock, CheckCircle, Target } from 'lucide-react';
import { KpiCard } from '../KpiCard';
import { AlertBadge } from '../AlertBadge';
import { ProgressBar } from '../ProgressBar';

interface RenewalData {
  status: string;
  count: number;
  percentage: number;
}

interface EnhancedRenewalStatusChartProps {
  data: RenewalData[];
  insight: string;
}

const STATUS_COLORS = {
  'Pendente': '#ef4444',
  'Em Contato': '#f59e0b',
  'Proposta Enviada': '#3b82f6',
  'Renovada': '#10b981',
  'Não Renovada': '#6b7280',
};

const STATUS_ICONS = {
  'Pendente': '⏳',
  'Em Contato': '📞',
  'Proposta Enviada': '📋',
  'Renovada': '✅',
  'Não Renovada': '❌',
};

export function EnhancedRenewalStatusChart({ data, insight }: EnhancedRenewalStatusChartProps) {
  const totalRenewals = data.reduce((sum, item) => sum + item.count, 0);
  
  // Calcular métricas
  const renovadas = data.find(item => item.status === 'Renovada')?.count || 0;
  const pendentes = data.find(item => item.status === 'Pendente')?.count || 0;
  const emAndamento = data.filter(item => 
    ['Em Contato', 'Proposta Enviada'].includes(item.status)
  ).reduce((sum, item) => sum + item.count, 0);
  const naoRenovadas = data.find(item => item.status === 'Não Renovada')?.count || 0;
  
  const taxaRenovacao = totalRenewals > 0 ? (renovadas / totalRenewals) * 100 : 0;
  const taxaConversao = (renovadas + emAndamento) > 0 ? (renovadas / (renovadas + emAndamento)) * 100 : 0;
  
  // Meta fictícia de 85% de renovação
  const metaRenovacao = totalRenewals * 0.85;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const icon = STATUS_ICONS[data.status as keyof typeof STATUS_ICONS] || '📊';
      
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{icon}</span>
            <p className="text-white font-medium">{data.status}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-slate-300">
              <span className="font-semibold">{data.count}</span> apólices
            </p>
            <p className="text-slate-400">
              {data.percentage.toFixed(1)}% do total
            </p>
            {data.status === 'Renovada' && (
              <p className="text-green-400 mt-2">
                🎯 Meta: {metaRenovacao.toFixed(0)} apólices
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage, payload }: any) => {
    if (percentage < 5) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const icon = STATUS_ICONS[payload.status as keyof typeof STATUS_ICONS] || '';

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="500"
      >
        {`${icon} ${percentage.toFixed(0)}%`}
      </text>
    );
  };

  // Dados para funil de conversão
  const funnelData = [
    { stage: 'Total de Processos', value: totalRenewals, color: '#6b7280' },
    { stage: 'Em Andamento', value: emAndamento + renovadas, color: '#3b82f6' },
    { stage: 'Renovadas', value: renovadas, color: '#10b981' },
  ];

  return (
    <AppCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 bg-opacity-20">
            <PieChartIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Central de Comando - Renovações</h3>
            <p className="text-sm text-slate-400">
              Funil de renovações • {totalRenewals} apólices no período
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {pendentes > 0 && (
            <AlertBadge type="critical" text="Pendentes" count={pendentes} />
          )}
          {emAndamento > 0 && (
            <AlertBadge type="warning" text="Em Andamento" count={emAndamento} />
          )}
          <AlertBadge type="success" text="Renovadas" count={renovadas} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          title="Taxa de Renovação"
          value={`${taxaRenovacao.toFixed(0)}%`}
          subtitle={`${renovadas}/${totalRenewals} apólices`}
          icon={Target}
          trend={taxaRenovacao >= 80 ? 'up' : taxaRenovacao >= 60 ? 'neutral' : 'down'}
          trendValue={taxaRenovacao >= 80 ? 'Excelente' : 'Atenção'}
        />
        
        <KpiCard
          title="Taxa de Conversão"
          value={`${taxaConversao.toFixed(0)}%`}
          subtitle="Do pipeline ativo"
          icon={CheckCircle}
          trend={taxaConversao >= 70 ? 'up' : 'neutral'}
          trendValue={`${emAndamento} em andamento`}
        />
        
        <KpiCard
          title="Ações Urgentes"
          value={pendentes}
          subtitle="Requerem contato"
          icon={AlertTriangle}
          trend={pendentes > 0 ? 'down' : 'up'}
          trendValue={pendentes > 0 ? 'Ação necessária' : 'Em dia'}
        />
      </div>

      {/* Progresso da Meta */}
      <div className="mb-6">
        <ProgressBar
          label="Progresso da Meta de Renovação (85%)"
          value={renovadas}
          max={metaRenovacao}
          color={renovadas >= metaRenovacao ? 'green' : renovadas >= metaRenovacao * 0.8 ? 'amber' : 'red'}
        />
      </div>

      {/* Funil de Conversão */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-white mb-3">Funil de Conversão</h4>
        <div className="space-y-2">
          {funnelData.map((stage, index) => {
            const percentage = totalRenewals > 0 ? (stage.value / totalRenewals) * 100 : 0;
            return (
              <div key={stage.stage} className="flex items-center gap-3">
                <div className="w-24 text-xs text-slate-400">{stage.stage}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{stage.value} apólices</span>
                    <span className="text-slate-400">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-300 rounded-full"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: stage.color
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gráfico Principal */}
      <div className="h-80 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
              innerRadius={40}
              fill="#8884d8"
              dataKey="count"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#6b7280'} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '14px',
                color: '#cbd5e1'
              }}
              formatter={(value, entry) => {
                const icon = STATUS_ICONS[value as keyof typeof STATUS_ICONS] || '';
                return <span style={{ color: '#cbd5e1' }}>{icon} {value}</span>;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ChartInsight icon={PieChartIcon} text={insight} />
    </AppCard>
  );
}
