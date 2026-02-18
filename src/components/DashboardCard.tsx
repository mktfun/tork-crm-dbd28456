import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AppCard } from '@/components/ui/app-card';

interface DashboardCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  href: string;
  variant?: 'default' | 'warning' | 'critical' | 'success';
  className?: string;
}

export function DashboardCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  variant = 'default',
  className
}: DashboardCardProps) {
  const variantStyles = {
    default: 'border-border bg-card hover:bg-secondary/70',
    warning: 'border-yellow-500/50 bg-yellow-900/20 hover:bg-yellow-900/30',
    critical: 'border-red-500/50 bg-red-900/20 hover:bg-red-900/30',
    success: 'border-green-500/50 bg-green-900/20 hover:bg-green-900/30',
  };

  return (
    <Link to={href} className="block">
      <AppCard className={cn(
        "flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer",
        variantStyles[variant],
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-foreground mb-1">{value}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="p-2 rounded-lg bg-foreground/10">
            <Icon size={24} />
          </div>
        </div>
      </AppCard>
    </Link>
  );
}
