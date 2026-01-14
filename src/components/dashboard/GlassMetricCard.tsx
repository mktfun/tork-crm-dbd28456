
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    neutral: 'text-white'
  };

  return (
    <Link to={href} className="block group">
      <div className={cn(
        "glass-card p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl",
        "hover:bg-white/20 cursor-pointer",
        className
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-white/10">
                <Icon className="w-5 h-5 text-white" />
              </div>
            )}
            <h3 className="text-sm font-medium text-white/80">{title}</h3>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className={cn(
            "text-3xl font-bold transition-colors",
            trendColors[trend]
          )}>
            {value}
          </div>
        </div>
      </div>
    </Link>
  );
}
