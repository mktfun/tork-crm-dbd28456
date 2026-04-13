import { Link } from 'react-router-dom';
import { AppCard } from '@/components/ui/app-card';

interface MetricCardProps {
  title: string;
  value: number | string;
  href: string;
}

export function MetricCard({ title, value, href }: MetricCardProps) {
  return (
    <Link to={href} className="block">
      <AppCard className="flex flex-col justify-between transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer border-border bg-card hover:bg-secondary/70">
        <div className="text-2xl md:text-3xl font-bold text-foreground">{value}</div>
        <div className="text-sm font-medium text-muted-foreground mt-1">{title}</div>
      </AppCard>
    </Link>
  );
}
