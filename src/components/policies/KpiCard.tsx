import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppCard } from '@/components/ui/app-card';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: string;
  variant?: 'default' | 'warning' | 'success';
  isLoading?: boolean;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  subtitle,
  variant = 'default',
  isLoading = false,
}: KpiCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'warning':
        return 'border-yellow-600/50 bg-yellow-600/10';
      case 'success':
        return 'border-green-600/50 bg-green-600/10';
      default:
        return 'border-border bg-card';
    }
  };

  if (isLoading) {
    return (
      <AppCard className="flex flex-col justify-between border-border bg-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className={cn(
      "flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer hover:bg-secondary/70",
      getVariantClasses()
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col space-y-1 flex-1 min-w-0 overflow-hidden">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p
            className="text-2xl md:text-3xl font-bold text-foreground whitespace-nowrap truncate"
            title={String(value)}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-foreground/10 flex-shrink-0">
          <Icon className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </AppCard>
  );
}
