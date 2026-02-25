
import { Client, Policy } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';
import { AppCard } from '@/components/ui/app-card';
import { TrendingUp, Users, FileText, Target } from 'lucide-react';

interface VisaoGeralCarteiraProps {
  clientes: Client[];
  apolices: Policy[];
}

export function VisaoGeralCarteira({ clientes, apolices }: VisaoGeralCarteiraProps) {
  const apolicesAtivas = apolices.filter(p => p.status === 'Ativa');
  const clienteIdsComApolicesAtivas = new Set(apolicesAtivas.map(p => p.clientId));
  const numeroClientesUnicos = clienteIdsComApolicesAtivas.size;
  const valorTotalCarteira = apolicesAtivas.reduce((sum, p) => sum + p.premiumValue, 0);
  const numeroApolicesAtivas = apolicesAtivas.length;
  const ticketMedio = numeroClientesUnicos > 0 ? valorTotalCarteira / numeroClientesUnicos : 0;
  const apolicesPorCliente = numeroClientesUnicos > 0 ? numeroApolicesAtivas / numeroClientesUnicos : 0;
  const totalApolices = apolices.length;
  const apolicesAguardando = apolices.filter(p => p.status === 'Aguardando Apólice').length;

  const metrics = [
    {
      title: "Valor Total da Carteira",
      value: formatCurrency(valorTotalCarteira),
      icon: TrendingUp,
      bgColor: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
      description: "Prêmio total de apólices ativas"
    },
    {
      title: "Total de Clientes",
      value: numeroClientesUnicos.toLocaleString(),
      icon: Users,
      bgColor: "bg-blue-500/15",
      iconColor: "text-blue-400",
      description: "Clientes únicos com apólices ativas"
    },
    {
      title: "Total de Apólices",
      value: totalApolices.toLocaleString(),
      icon: FileText,
      bgColor: "bg-purple-500/15",
      iconColor: "text-purple-400",
      description: "Apólices com vigência no período"
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(ticketMedio),
      icon: Target,
      bgColor: "bg-orange-500/15",
      iconColor: "text-orange-400",
      description: "Valor médio por cliente ativo"
    }
  ];

  return (
    <AppCard className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-2">Visão Geral da Carteira</h2>
        <p className="text-muted-foreground">Indicadores principais do portfólio de seguros</p>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="relative overflow-hidden rounded-lg bg-card border border-border p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                </div>
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <Icon className={`w-6 h-6 ${metric.iconColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalhamento por Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-card border border-border border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Apólices Ativas</p>
              <p className="text-xl font-bold text-emerald-400">{numeroApolicesAtivas}</p>
            </div>
            <div className="text-2xl text-muted-foreground">
              {totalApolices > 0 ? `${((numeroApolicesAtivas / totalApolices) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border border-l-4 border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aguardando Apólice</p>
              <p className="text-xl font-bold text-yellow-400">{apolicesAguardando}</p>
            </div>
            <div className="text-2xl text-muted-foreground">
              {totalApolices > 0 ? `${((apolicesAguardando / totalApolices) * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Adicionais */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg bg-card border border-border">
            <p className="text-sm text-muted-foreground mb-2">Apólices por Cliente</p>
            <p className="text-2xl font-bold text-foreground">{apolicesPorCliente.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Média de produtos por cliente ativo</p>
          </div>

          <div className="p-4 rounded-lg bg-card border border-border">
            <p className="text-sm text-muted-foreground mb-2">Taxa de Ativação</p>
            <p className="text-2xl font-bold text-foreground">
              {totalApolices > 0 ? ((numeroApolicesAtivas / totalApolices) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Percentual de apólices ativas</p>
          </div>
        </div>
      </div>
    </AppCard>
  );
}
