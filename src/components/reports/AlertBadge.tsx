
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertBadgeProps {
  type: 'critical' | 'warning' | 'success' | 'info';
  text: string;
  count?: number;
  className?: string;
}

export function AlertBadge({ type, text, count, className }: AlertBadgeProps) {
  const getConfig = () => {
    switch (type) {
      case 'critical':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-red-500/20 border-red-500/30',
          textColor: 'text-red-400',
          iconColor: 'text-red-500'
        };
      case 'warning':
        return {
          icon: Clock,
          bgColor: 'bg-amber-500/20 border-amber-500/30',
          textColor: 'text-amber-400',
          iconColor: 'text-amber-500'
        };
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500/20 border-green-500/30',
          textColor: 'text-green-400',
          iconColor: 'text-green-500'
        };
      default:
        return {
          icon: Clock,
          bgColor: 'bg-blue-500/20 border-blue-500/30',
          textColor: 'text-blue-400',
          iconColor: 'text-blue-500'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium",
      config.bgColor,
      config.textColor,
      className
    )}>
      <Icon className={cn("w-3 h-3", config.iconColor)} />
      <span>{text}</span>
      {count !== undefined && (
        <span className="bg-white/20 text-white rounded-full px-1.5 py-0.5 text-xs font-bold">
          {count}
        </span>
      )}
    </div>
  );
}
