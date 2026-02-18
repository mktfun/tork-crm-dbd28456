
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

const STATUS_COLORS = {
  'Pendente': '#ef4444',
  'Em Contato': '#f59e0b',
  'Proposta Enviada': '#3b82f6',
  'Renovada': '#10b981',
  'Não Renovada': '#6b7280',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} className="border rounded-lg p-3 shadow-lg">
        <p className="text-foreground font-medium">{data.status}</p>
        <p className="text-muted-foreground">
          <span className="font-semibold">{data.count}</span> apólices
        </p>
        <p className="text-muted-foreground text-sm">
          {data.percentage.toFixed(1)}% do total
        </p>
      </div>
    );
  }
  return null;
};

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
  if (percentage < 5) return null;

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
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <PieChartIcon className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Distribuição de Renovações por Status</h3>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Funil de renovações por status atual • {totalRenewals} apólices no período
        </p>
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
              }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ChartInsight icon={PieChartIcon} text={insight} />
    </AppCard>
  );
}
