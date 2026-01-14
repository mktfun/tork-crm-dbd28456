
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'red' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({ 
  value, 
  max, 
  label, 
  showPercentage = true, 
  color = 'blue',
  size = 'md',
  className 
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'red':
        return 'bg-red-500';
      case 'amber':
        return 'bg-amber-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-1.5';
      case 'lg':
        return 'h-3';
      default:
        return 'h-2';
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-xs">
          {label && <span className="text-slate-400">{label}</span>}
          {showPercentage && (
            <span className="text-slate-300 font-medium">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      
      <div className={cn(
        "bg-slate-700 rounded-full overflow-hidden",
        getSizeClasses()
      )}>
        <div 
          className={cn(
            "transition-all duration-300 ease-out rounded-full",
            getSizeClasses(),
            getColorClasses()
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-slate-500">
        <span>{value.toLocaleString('pt-BR')}</span>
        <span>{max.toLocaleString('pt-BR')}</span>
      </div>
    </div>
  );
}
