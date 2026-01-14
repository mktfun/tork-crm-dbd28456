
import { BarChart3, CheckCircle, XCircle, Clock, Target } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';

interface WeeklyStats {
  total: number;
  realizados: number;
  cancelados: number;
  pendentes: number;
  taxaComparecimento: number;
}

interface WeeklySummaryCardProps {
  weeklyStats?: WeeklyStats;
}

export function WeeklySummaryCard({ weeklyStats }: WeeklySummaryCardProps) {
  if (!weeklyStats) {
    return (
      <AppCard className="h-fit">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Desempenho da Semana</h3>
            <p className="text-sm text-white/60">Carregando estatísticas...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-white/5 rounded-lg"></div>
          <div className="h-16 bg-white/5 rounded-lg"></div>
        </div>
      </AppCard>
    );
  }

  const kpis = [
    {
      label: 'Total de Agendamentos',
      value: weeklyStats.total,
      icon: Target,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      label: 'Realizados',
      value: weeklyStats.realizados,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      label: 'Cancelados',
      value: weeklyStats.cancelados,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20'
    },
    {
      label: 'Taxa de Comparecimento',
      value: `${weeklyStats.taxaComparecimento}%`,
      icon: BarChart3,
      color: weeklyStats.taxaComparecimento >= 80 ? 'text-green-400' : 
             weeklyStats.taxaComparecimento >= 60 ? 'text-yellow-400' : 'text-red-400',
      bgColor: weeklyStats.taxaComparecimento >= 80 ? 'bg-green-500/20' : 
               weeklyStats.taxaComparecimento >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
    }
  ];

  return (
    <AppCard className="h-fit">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <BarChart3 className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Desempenho da Semana</h3>
          <p className="text-sm text-white/60">Domingo a sábado</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi, index) => {
          const IconComponent = kpi.icon;
          
          return (
            <div
              key={index}
              className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 ${kpi.bgColor} rounded-md`}>
                  <IconComponent className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              
              <div className="text-2xl font-bold text-white mb-1">
                {kpi.value}
              </div>
              
              <div className="text-xs text-white/60 leading-tight">
                {kpi.label}
              </div>
            </div>
          );
        })}
      </div>

      {weeklyStats.total > 0 && (
        <div className="mt-4 p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Pendentes:</span>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-medium">{weeklyStats.pendentes}</span>
            </div>
          </div>
        </div>
      )}

      {weeklyStats.total === 0 && (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
            <BarChart3 className="w-6 h-6 text-white/40" />
          </div>
          <p className="text-white/60 text-sm">Nenhum agendamento esta semana</p>
          <p className="text-white/40 text-xs mt-1">Hora de acelerar!</p>
        </div>
      )}
    </AppCard>
  );
}
