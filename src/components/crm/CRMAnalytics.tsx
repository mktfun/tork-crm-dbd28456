import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCRMDeals, useCRMStages } from '@/hooks/useCRMDeals';
import { formatCurrency } from '@/utils/formatCurrency';
import { DollarSign, TrendingUp, Target, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface CRMAnalyticsProps {
  pipelineId: string | null;
}

export function CRMAnalytics({ pipelineId }: CRMAnalyticsProps) {
  const { deals, isLoading: dealsLoading } = useCRMDeals(pipelineId);
  const { stages, isLoading: stagesLoading } = useCRMStages(pipelineId);

  const isLoading = dealsLoading || stagesLoading;


  const analytics = useMemo(() => {
    if (!deals.length || !stages.length) return null;

    const wonStage = stages.find(s => s.chatwoot_label?.toLowerCase().includes('ganho'));
    const lostStage = stages.find(s => s.chatwoot_label?.toLowerCase().includes('perdido'));

    const wonDeals = wonStage ? deals.filter(d => d.stage_id === wonStage.id) : [];
    const lostDeals = lostStage ? deals.filter(d => d.stage_id === lostStage.id) : [];
    const activeDeals = deals.filter(d => {
      if (wonStage && d.stage_id === wonStage.id) return false;
      if (lostStage && d.stage_id === lostStage.id) return false;
      return true;
    });

    const totalInNegotiation = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const conversionRate = (wonDeals.length + lostDeals.length) > 0
      ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
      : 0;
    const avgTicket = wonDeals.length > 0
      ? wonDeals.reduce((sum, d) => sum + (d.value || 0), 0) / wonDeals.length
      : 0;

    // Bar chart data: Won vs Lost
    const barData = [
      { name: 'Ganhos', value: wonDeals.length, fill: 'hsl(var(--chart-2))' },
      { name: 'Perdidos', value: lostDeals.length, fill: 'hsl(var(--chart-5))' },
    ];

    // Pie chart data: Distribution by stage
    const pieData = stages.map(stage => ({
      name: stage.name,
      value: deals.filter(d => d.stage_id === stage.id).length,
      color: stage.color,
    })).filter(d => d.value > 0);

    return {
      totalInNegotiation,
      conversionRate,
      avgTicket,
      activeCount: activeDeals.length,
      wonCount: wonDeals.length,
      lostCount: lostDeals.length,
      barData,
      pieData,
    };
  }, [deals, stages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum dado disponível para exibir.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total em Negociação</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(analytics.totalInNegotiation)}</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.activeCount} negócio(s) ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analytics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{analytics.wonCount} ganhos / {analytics.lostCount} perdidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(analytics.avgTicket)}</div>
            <p className="text-xs text-muted-foreground mt-1">Baseado em negócios ganhos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Won vs Lost */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Ganhos vs Perdidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.barData}>
                <CartesianGrid 
                  stroke="hsl(var(--border))" 
                  strokeDasharray="3 3" 
                  vertical={false} 
                />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {analytics.barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart: Distribution by Stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Distribuição por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {analytics.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span style={{ color: 'hsl(var(--foreground))', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
