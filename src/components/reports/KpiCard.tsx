
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    return trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400';
  };

  const getTrendIcon = () => {
    if (!trend) return '';
    return trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';
  };

  return (
    <div className={cn(
      "bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5 text-blue-400" />
        {trend && trendValue && (
          <span className={cn("text-xs font-medium flex items-center gap-1", getTrendColor())}>
            <span>{getTrendIcon()}</span>
            {trendValue}
          </span>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400 uppercase tracking-wide">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
