import { KpiCard } from '@/components/policies/KpiCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSuperAdminStats, useAIUsageByDay } from '@/hooks/useSuperAdminStats';
import { Building2, Users, Brain, Activity } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useSuperAdminStats();
  const { data: aiUsage, isLoading: aiLoading } = useAIUsageByDay(7);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard Administrativo</h1>
        <p className="text-sm text-zinc-400 mt-1">Visão geral do sistema Tork</p>
      </div>

      {/* KPIs */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-zinc-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total de Corretoras"
            value={stats?.totalBrokerages || 0}
            icon={Building2}
            subtitle="Cadastradas no sistema"
          />
          <KpiCard
            title="Usuários Totais"
            value={stats?.totalUsers || 0}
            icon={Users}
            subtitle="Perfis ativos"
            variant="success"
          />
          <KpiCard
            title="Requisições de IA"
            value={(stats?.totalAIRequests || 0).toLocaleString('pt-BR')}
            icon={Brain}
            subtitle="Total histórico"
          />
          <KpiCard
            title="Status do Sistema"
            value={stats?.systemStatus || 'Operacional'}
            icon={Activity}
            subtitle="Todos os serviços"
            variant="success"
          />
        </div>
      )}

      {/* AI Usage Chart */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Uso de IA - Últimos 7 dias</CardTitle>
          <CardDescription>Comparativo de tokens por provedor</CardDescription>
        </CardHeader>
        <CardContent>
          {aiLoading ? (
            <Skeleton className="h-80 bg-zinc-800" />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={aiUsage || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#71717a"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#71717a"
                  fontSize={12}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                  }}
                  labelFormatter={formatDate}
                  formatter={(value: number) => [value.toLocaleString(), 'Tokens']}
                />
                <Legend />
                <Bar 
                  dataKey="gemini" 
                  name="Gemini (Assistente)" 
                  fill="#10b981" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="mistral" 
                  name="Mistral (OCR)" 
                  fill="#f59e0b" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="openai" 
                  name="OpenAI" 
                  fill="#6366f1" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
