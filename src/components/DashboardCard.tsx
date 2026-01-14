
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
    default: 'hover:bg-gray-50 border-gray-200',
    warning: 'hover:bg-yellow-50 border-yellow-200 bg-yellow-50/30',
    critical: 'hover:bg-red-50 border-red-200 bg-red-50/30',
    success: 'hover:bg-green-50 border-green-200 bg-green-50/30',
  };

  const iconStyles = {
    default: 'text-gray-600',
    warning: 'text-warning',
    critical: 'text-critical',
    success: 'text-success',
  };

  return (
    <Link to={href} className="block">
      <div className={cn(
        "bg-white border rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer",
        variantStyles[variant],
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <div className={cn(
            "p-3 rounded-lg bg-white/50",
            iconStyles[variant]
          )}>
            <Icon size={24} />
          </div>
        </div>
      </div>
    </Link>
  );
}
