import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppCard } from '@/components/ui/app-card';

interface GlassMetricCardProps {
  title: string;
  value: number | string;
  href: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function GlassMetricCard({
  title,
  value,
  href,
  icon: Icon,
  trend = 'neutral',
  className
}: GlassMetricCardProps) {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-foreground'
  };

  return (
    <Link to={href} className="block">
      <AppCard className={cn(
        "flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border-border bg-card hover:bg-secondary/70",
        className
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-foreground/10">
                <Icon className="w-5 h-5 text-foreground" />
              </div>
            )}
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          </div>
        </div>

        <div className={cn(
          "text-2xl md:text-3xl font-bold transition-colors",
          trendColors[trend]
        )}>
          {value}
        </div>
      </AppCard>
    </Link>
  );
}
