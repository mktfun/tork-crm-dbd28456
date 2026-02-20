import { DateRange } from 'react-day-picker';
import { BranchDistributionChart } from './charts/BranchDistributionChart';
import { CompanyDistributionChart } from './charts/CompanyDistributionChart';
import { GrowthChart } from './charts/GrowthChart';
import { Loader2 } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';

interface DashboardChartsGridProps {
  dateRange?: DateRange;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics: Record<string, any>;
}

export function DashboardChartsGrid({
  dateRange,
  metrics
}: DashboardChartsGridProps) {

  if (metrics.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1">
          <AppCard className="p-6 flex items-center justify-center h-80">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </AppCard>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <AppCard key={i} className="p-6 flex items-center justify-center h-80">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </AppCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1">
        <GrowthChart
          data={metrics.monthlyGrowthData}
          dateRange={dateRange}
          insight={metrics.insightCrescimento}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BranchDistributionChart
          data={metrics.branchDistributionData}
          dateRange={dateRange}
          insight={metrics.insightRamoPrincipal}
        />
        <CompanyDistributionChart
          data={metrics.companyDistributionData}
          dateRange={dateRange}
          insight={metrics.insightSeguradoraPrincipal}
        />
      </div>
    </div>
  );
}
