import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AppCard } from '@/components/ui/app-card';

interface KpiCardProps {
  title: string;
  value: string;
  comparison?: string;
  icon: ReactNode;
  colorVariant?: 'default' | 'warning' | 'danger';
  onClick?: () => void;
  className?: string;
  zeroLabel?: string;
}

export function KpiCard({
  title,
  value,
  comparison,
  icon,
  colorVariant = 'default',
  onClick,
  className,
  zeroLabel
}: KpiCardProps) {
  const colorClasses = {
    default: 'flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:translate-y-[-2px] cursor-pointer border-border bg-card hover:bg-secondary/70',
    warning: 'flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:translate-y-[-2px] cursor-pointer border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/15',
    danger: 'flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:translate-y-[-2px] cursor-pointer border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15'
  };

  return (
    <AppCard
      className={cn(
        colorClasses[colorVariant],
        className
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn(
          "p-2 rounded-lg bg-foreground/10",
          colorVariant !== 'default' ? 'text-current' : ''
        )}>
          {icon}
        </div>
      </div>

      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground break-words mb-1">
          {value}
        </h2>
        {value === '0' && zeroLabel && (
          <p className="text-xs text-muted-foreground">{zeroLabel}</p>
        )}
        {comparison && (
          <p className="text-xs text-muted-foreground line-clamp-2">{comparison}</p>
        )}
      </div>
    </AppCard>
  );
}
