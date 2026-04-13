
import { AppCard } from '@/components/ui/app-card';
import { ChartInsight } from '@/components/dashboard/charts/ChartInsight';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Calendar, AlertTriangle, Clock, DollarSign, Phone } from 'lucide-react';
import { KpiCard } from '../KpiCard';
import { AlertBadge } from '../AlertBadge';
import { ProgressBar } from '../ProgressBar';

interface ExpirationData {
  periodo: string;
  vencendoEm30Dias: number;
  vencendoEm60Dias: number;
  vencendoEm90Dias: number;
  vencidas: number;
}

interface EnhancedExpirationCalendarChartProps {
  data: ExpirationData[];
  insight: string;
}

export function EnhancedExpirationCalendarChart({ data, insight }: EnhancedExpirationCalendarChartProps) {
  // Calcular totais
  const totalVencidas = data.reduce((sum, item) => sum + item.vencidas, 0);
  const totalVencendo30 = data.reduce((sum, item) => sum + item.vencendoEm30Dias, 0);
  const totalVencendo60 = data.reduce((sum, item) => sum + item.vencendoEm60Dias, 0);
  const totalVencendo90 = data.reduce((sum, item) => sum + item.vencendoEm90Dias, 0);
  
  const totalCriticas = totalVencidas + totalVencendo30;
  const totalGeral = totalVencidas + totalVencendo30 + totalVencendo60 + totalVencendo90;
  
  // Valores fictícios em risco (baseado em um valor médio de apólice)
  const valorMedioApolice = 2500;
  const valorEmRisco30 = totalVencendo30 * valorMedioApolice;
  const valorEmRisco60 = totalVencendo60 * valorMedioApolice;
  const valorEmRiscoVencidas = totalVencidas * valorMedioApolice;

  // Ações urgentes (lista fictícia baseada nos dados)
  const acoesUrgentes = [
    { tipo: 'Ligar para clientes', count: totalVencendo30, prioridade: 'alta' },
    { tipo: 'Enviar propostas', count: Math.min(totalVencendo60, 15), prioridade: 'média' },
    { tipo: 'Agendar reuniões', count: Math.min(totalVencendo90, 10), prioridade: 'baixa' },
  ].filter(acao => acao.count > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
          <div style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} className="border rounded-lg p-4 shadow-lg">
          <p className="text-foreground font-medium mb-3">{label}</p>
          {payload.map((entry: any, index: number) => {
            const getIcon = (name: string) => {
              switch (name) {
                case 'Vencidas': return '🔴';
                case '30 dias': return '🟡';
                case '60 dias': return '🟠';
                case '90 dias': return '🟢';
                default: return '📊';
              }
            };

            return (
              <div key={index} className="flex items-center justify-between gap-4 text-sm mb-1">
                <div className="flex items-center gap-2">
                  <span>{getIcon(entry.name)}</span>
                  <span className="text-muted-foreground">{entry.name}:</span>
                </div>
                <span className="text-foreground font-medium">{entry.value} apólices</span>
              </div>
            );
          })}
            <div className="border-t border-border mt-2 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="text-foreground font-medium">{total} apólices</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Valor estimado:</span>
              <span>R$ {(total * valorMedioApolice).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <AppCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 bg-opacity-20">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Sistema de Alerta - Vencimentos</h3>
            <p className="text-sm text-muted-foreground">Timeline crítica de renovações</p>
          </div>
        </div>

        <div className="flex gap-2">
          {totalVencidas > 0 && (
            <AlertBadge type="critical" text="Vencidas" count={totalVencidas} />
          )}
          {totalVencendo30 > 0 && (
            <AlertBadge type="warning" text="30 dias" count={totalVencendo30} />
          )}
          <AlertBadge type="info" text="Pipeline" count={totalVencendo60 + totalVencendo90} />
        </div>
      </div>

      {/* KPIs Críticos */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          title="Situação Crítica"
          value={totalCriticas}
          subtitle="Vencidas + 30 dias"
          icon={AlertTriangle}
          trend={totalVencidas > 0 ? 'down' : totalVencendo30 > 0 ? 'neutral' : 'up'}
          trendValue={totalVencidas > 0 ? 'Urgente' : 'Atenção'}
        />
        
        <KpiCard
          title="Valor em Risco"
          value={`R$ ${(valorEmRisco30 / 1000).toFixed(0)}k`}
          subtitle="Próximos 30 dias"
          icon={DollarSign}
          trend="down"
          trendValue={`+ R$ ${(valorEmRiscoVencidas / 1000).toFixed(0)}k vencidas`}
        />
        
        <KpiCard
          title="Ações Urgentes"
          value={acoesUrgentes.length}
          subtitle="Tipos de ação"
          icon={Phone}
          trend="neutral"
          trendValue={`${totalVencendo30} contatos`}
        />
      </div>

      {/* Lista de Ações Urgentes */}
      {acoesUrgentes.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-foreground mb-3">🚨 Ações Prioritárias</h4>
          <div className="space-y-2">
            {acoesUrgentes.map((acao, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    acao.prioridade === 'alta' ? 'bg-red-500' : 
                    acao.prioridade === 'média' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <span className="text-muted-foreground text-sm">{acao.tipo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-medium">{acao.count}</span>
                  <span className="text-xs text-muted-foreground">clientes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progresso de Resolução */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-foreground mb-3">Progresso de Resolução</h4>
        <div className="space-y-3">
          <ProgressBar
            label="Situações Críticas Resolvidas"
            value={Math.max(0, totalGeral - totalCriticas)}
            max={totalGeral}
            color={totalCriticas === 0 ? 'green' : totalCriticas < totalGeral * 0.3 ? 'amber' : 'red'}
          />
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-secondary/30 p-2 rounded">
              <span className="text-muted-foreground">Meta: Reduzir críticas para </span>
              <span className="text-foreground font-medium">{'< 5%'}</span>
            </div>
            <div className="bg-secondary/30 p-2 rounded">
              <span className="text-muted-foreground">Atual: </span>
              <span className={`font-medium ${
                totalGeral > 0 && (totalCriticas / totalGeral) * 100 < 5 ? 'text-green-400' : 
                totalGeral > 0 && (totalCriticas / totalGeral) * 100 < 15 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {totalGeral > 0 ? ((totalCriticas / totalGeral) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-80 flex items-center justify-center border border-dashed border-border rounded-lg">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Nenhuma apólice com vencimentos no período</p>
          </div>
        </div>
      ) : (
        <>
          {/* Gráfico Principal */}
          <div className="h-80 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="periodo" 
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
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px' }} formatter={(value: string) => <span className="text-muted-foreground">{value}</span>} />
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

          <ChartInsight icon={AlertTriangle} text={insight} />
        </>
      )}
    </AppCard>
  );
}
