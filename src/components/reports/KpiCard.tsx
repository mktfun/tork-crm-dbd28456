import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppCard } from '@/components/ui/app-card';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  className
}: KpiCardProps) {
  const getTrendColor = () => {
    if (!trend) return '';
    return trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground';
  };

  const getTrendIcon = () => {
    if (!trend) return '';
    return trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
  };

  return (
    <AppCard className={cn(
      "flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border-border bg-card hover:bg-secondary/70",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg bg-foreground/10">
          <Icon className="w-5 h-5 text-foreground" />
        </div>
        {trend && trendValue && (
          <span className={cn("text-xs font-medium flex items-center gap-1", getTrendColor())}>
            <span>{getTrendIcon()}</span>
            {trendValue}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </AppCard>
  );
}
