
import { TrendingUp, Info } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

interface DashboardGlobalInsightProps {
  insight: string;
  isLoading?: boolean;
}

export function DashboardGlobalInsight({ insight, isLoading }: DashboardGlobalInsightProps) {
  if (isLoading) {
    return (
      <GlassCard className="p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-foreground/20 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-foreground/20 rounded w-3/4"></div>
            <div className="h-4 bg-foreground/20 rounded w-1/2"></div>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4 hover:bg-foreground/15 transition-all duration-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <TrendingUp className="h-5 w-5 text-blue-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-foreground/90 mb-1">
            Resumo Estratégico
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight}
          </p>
        </div>
        <div className="flex-shrink-0 mt-0.5">
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </GlassCard>
  );
}
