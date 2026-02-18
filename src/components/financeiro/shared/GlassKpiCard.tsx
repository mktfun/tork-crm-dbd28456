import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppCard } from '@/components/ui/app-card';

/**
 * 🔒 COMPONENTE UNIFICADO - GLASS KPI CARD
 * Agora usa AppCard como base para consistência system-wide.
 */

export interface GlassKpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconClassName?: string;
  trend?: { value: number; label?: string } | null;
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function GlassKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClassName,
  trend,
  isLoading,
  onClick,
  className,
}: GlassKpiCardProps) {
  return (
    <AppCard
      onClick={onClick}
      className={cn(
        'flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg border-border bg-card hover:bg-secondary/70',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <>
              <p className="text-2xl md:text-3xl font-bold text-foreground break-words">
                {value}
              </p>
              {trend && trend.value !== 0 && (
                <p className={cn(
                  'text-xs font-medium flex items-center gap-1',
                  trend.value > 0 ? 'text-emerald-400' : 'text-rose-400'
                )}>
                  {trend.value > 0
                    ? <TrendingUp className="w-3 h-3" />
                    : <TrendingDown className="w-3 h-3" />
                  }
                  {trend.value > 0 ? '+' : ''}{trend.value.toFixed(0)}%
                  <span className="text-muted-foreground font-normal ml-0.5">
                    {trend.label || 'vs anterior'}
                  </span>
                </p>
              )}
              {subtitle && (!trend || trend.value === 0) && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </>
          )}
        </div>
        <div className="p-2 rounded-lg bg-foreground/10 ml-3 shrink-0">
          <Icon className={cn('w-5 h-5', iconClassName)} />
        </div>
      </div>
    </AppCard>
  );
}
