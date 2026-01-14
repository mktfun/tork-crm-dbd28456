
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AppCard } from '@/components/ui/app-card';
import { ChartInsight } from '@/components/dashboard/charts/ChartInsight';
import { PieChart as PieChartIcon } from 'lucide-react';

interface RenewalData {
  status: string;
  count: number;
  percentage: number;
}

interface RenewalStatusChartProps {
  data: RenewalData[];
  insight: string;
}

// Cores para cada status de renovação
const STATUS_COLORS = {
  'Pendente': '#ef4444', // red-500
  'Em Contato': '#f59e0b', // amber-500
  'Proposta Enviada': '#3b82f6', // blue-500
  'Renovada': '#10b981', // emerald-500
  'Não Renovada': '#6b7280', // gray-500
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
        <p className="text-white font-medium">{data.status}</p>
        <p className="text-slate-300">
          <span className="font-semibold">{data.count}</span> apólices
        </p>
        <p className="text-slate-400 text-sm">
          {data.percentage.toFixed(1)}% do total
        </p>
      </div>
    );
  }
  return null;
};

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
  if (percentage < 5) return null; // Não mostrar labels para fatias muito pequenas
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="12"
      fontWeight="500"
    >
      {`${percentage.toFixed(0)}%`}
    </text>
  );
};

export function RenewalStatusChart({ data, insight }: RenewalStatusChartProps) {
  const totalRenewals = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <AppCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 bg-opacity-20">
          <PieChartIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Distribuição de Renovações por Status</h3>
          <p className="text-sm text-slate-400">
            Funil de renovações por status atual • {totalRenewals} apólices no período
          </p>
        </div>
      </div>

      <div className="h-80">
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
              formatter={(value) => <span style={{ color: '#cbd5e1' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ChartInsight icon={PieChartIcon} text={insight} />
    </AppCard>
  );
}
