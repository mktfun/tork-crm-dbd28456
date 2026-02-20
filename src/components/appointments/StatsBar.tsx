
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
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
              <Skeleton className="w-10 h-10 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-16 bg-muted" />
                <Skeleton className="h-4 w-20 bg-muted" />
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

  const realizadosPct = weeklyStats.total > 0
    ? Math.round((weeklyStats.realizados / weeklyStats.total) * 100)
    : 0;

  const stats = [
    {
      title: 'Total do Mês',
      value: weeklyStats.total,
      subtitle: 'agendamentos',
      icon: Calendar,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      title: 'Realizados',
      value: weeklyStats.realizados,
      subtitle: `${realizadosPct}% do total`,
      icon: CheckCircle,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    {
      title: 'Pendentes',
      value: weeklyStats.pendentes,
      subtitle: 'aguardando',
      icon: Clock,
      iconBg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Cancelados',
      value: weeklyStats.cancelados,
      subtitle: 'este mês',
      icon: XCircle,
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <AppCard key={index} className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.iconBg}`}>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-2xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </div>
              {stat.subtitle && (
                <div className="text-[11px] text-muted-foreground">
                  {stat.subtitle}
                </div>
              )}
            </div>
          </div>
        </AppCard>
      ))}
    </div>
  );
}
