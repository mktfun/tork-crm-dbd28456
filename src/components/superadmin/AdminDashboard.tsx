import { KpiCard } from '@/components/policies/KpiCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminMetrics, formatBytes } from '@/hooks/useSuperAdminData';
import { useAIUsageByDay } from '@/hooks/useSuperAdminStats';
import { Building2, Users, Brain, Activity, Database, HardDrive, FileText, UserCheck } from 'lucide-react';
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
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useAdminMetrics();
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
        <p className="text-sm text-zinc-400 mt-1">Visão geral do sistema Tork com dados em tempo real</p>
      </div>

      {/* KPIs */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-zinc-800" />
          ))}
        </div>
      ) : metricsError ? (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          Erro ao carregar métricas. Verifique se você tem permissões de admin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total de Corretoras"
            value={metrics?.total_brokerages || 0}
            icon={Building2}
            subtitle="Cadastradas no sistema"
          />
          <KpiCard
            title="Usuários Totais"
            value={metrics?.total_users || 0}
            icon={Users}
            subtitle="Perfis ativos"
            variant="success"
          />
          <KpiCard
            title="Requisições de IA"
            value={(metrics?.total_ai_requests || 0).toLocaleString('pt-BR')}
            icon={Brain}
            subtitle="Total histórico"
          />
          <KpiCard
            title="Status do Sistema"
            value="Operacional"
            icon={Activity}
            subtitle="Todos os serviços"
            variant="success"
          />
        </div>
      )}

      {/* Secondary KPIs */}
      {!metricsLoading && !metricsError && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard
            title="Total de Apólices"
            value={(metrics.total_policies || 0).toLocaleString('pt-BR')}
            icon={FileText}
            subtitle="No sistema"
          />
          <KpiCard
            title="Total de Clientes"
            value={(metrics.total_clients || 0).toLocaleString('pt-BR')}
            icon={UserCheck}
            subtitle="Cadastrados"
          />
          <KpiCard
            title="Tamanho do Banco"
            value={formatBytes(metrics.db_size_bytes || 0)}
            icon={Database}
            subtitle="Uso de disco"
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

      {/* Infrastructure Health */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100 flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Saúde do Banco de Dados
          </CardTitle>
          <CardDescription>Métricas de infraestrutura do Supabase</CardDescription>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <Skeleton className="h-24 bg-zinc-800" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-component p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border-border bg-card hover:bg-secondary/70">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-foreground/10">
                    <Database className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Uso de Disco (Database)</p>
                    <p className="text-2xl md:text-3xl font-bold text-foreground">
                      {formatBytes(metrics?.db_size_bytes || 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="glass-component p-4 shadow-lg flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border-border bg-card hover:bg-secondary/70">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-foreground/10">
                    <Activity className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status de Conexão</p>
                    <p className="text-2xl md:text-3xl font-bold text-foreground">Conectado</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
