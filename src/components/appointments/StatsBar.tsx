
import { Calendar, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';
import { Skeleton } from '@/components/ui/skeleton';

interface WeeklyStats {
  total: number;
  realizados: number;
  cancelados: number;
  pendentes: number;
  taxaComparecimento: number;
}

interface StatsBarProps {
  weeklyStats?: WeeklyStats;
  isLoading?: boolean;
}

export function StatsBar({ weeklyStats, isLoading }: StatsBarProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <AppCard key={i} className="p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg bg-white/10" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-16 bg-white/10" />
                <Skeleton className="h-4 w-20 bg-white/5" />
              </div>
            </div>
          </AppCard>
        ))}
      </div>
    );
  }

  if (!weeklyStats) {
    return null;
  }

  const stats = [
    {
      title: 'Total',
      value: weeklyStats.total,
      icon: Calendar,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      hoverColor: 'hover:bg-blue-500/30'
    },
    {
      title: 'Realizados',
      value: weeklyStats.realizados,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      hoverColor: 'hover:bg-green-500/30'
    },
    {
      title: 'Cancelados',
      value: weeklyStats.cancelados,
      icon: XCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      hoverColor: 'hover:bg-red-500/30'
    },
    {
      title: 'Taxa de Comparecimento',
      value: `${weeklyStats.taxaComparecimento}%`,
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      hoverColor: 'hover:bg-purple-500/30'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <AppCard 
          key={index} 
          className={`p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-white/5 ${stat.hoverColor} cursor-pointer group`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor} group-hover:scale-105 transition-transform duration-200`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-3xl font-bold text-white mb-1 group-hover:text-white/90 transition-colors">
                {stat.value}
              </div>
              <div className="text-xs text-white/50 truncate uppercase tracking-wider">
                {stat.title}
              </div>
            </div>
          </div>
        </AppCard>
      ))}
    </div>
  );
}
