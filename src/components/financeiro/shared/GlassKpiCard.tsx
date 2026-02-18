import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 🔒 COMPONENTE UNIFICADO - GLASS KPI CARD
 * 
 * Design "Glassmorphism 2026" padrão para TODOS os KPIs do módulo financeiro.
 * Usado em: Dashboard Home, Conciliação, Tesouraria, Relatórios.
 * 
 * ❌ NÃO criar cards de KPI avulsos com outro estilo.
 * ✅ Use este componente em todas as telas financeiras.
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
    <div
      onClick={onClick}
      className={cn(
        // Glass foundation
        'rounded-xl border border-white/10 bg-black/40 backdrop-blur-md',
        'shadow-lg shadow-black/20',
        // Hover & interaction
        'transition-all duration-300 hover:border-white/20 hover:bg-white/5 hover:shadow-xl',
        onClick && 'cursor-pointer hover:scale-[1.02]',
        className
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground break-words">
                  {value}
                </p>
                {/* Trend indicator */}
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
                {/* Subtitle (only when no trend) */}
                {subtitle && (!trend || trend.value === 0) && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </>
            )}
          </div>
          {/* Icon with glow */}
          <div className="p-2.5 rounded-xl bg-white/5 ml-3 shrink-0">
            <Icon className={cn('w-5 h-5', iconClassName)} />
          </div>
        </div>
      </div>
    </div>
  );
}
