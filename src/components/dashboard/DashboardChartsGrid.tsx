import { DateRange } from 'react-day-picker';
import { BranchDistributionChart } from './charts/BranchDistributionChart';
import { CompanyDistributionChart } from './charts/CompanyDistributionChart';
import { GrowthChart } from './charts/GrowthChart';
import { Loader2 } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';

interface DashboardChartsGridProps {
  dateRange?: DateRange;
  chartType: 'bar' | 'line';
  metrics: any;
}

export function DashboardChartsGrid({ 
  dateRange, 
  chartType, 
  metrics 
}: DashboardChartsGridProps) {
  
  if (metrics.isLoading) {
    return (
      <div className="space-y-6">
        {/* Crescimento Mensal - Área Vermelha */}
        <div className="grid grid-cols-1">
          <AppCard className="p-6 flex items-center justify-center h-80">
            <Loader2 className="h-8 w-8 animate-spin text-white/50" />
          </AppCard>
        </div>
        
        {/* Gráficos de Pizza - Área Verde */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <AppCard key={i} className="p-6 flex items-center justify-center h-80">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </AppCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ÁREA VERMELHA - GRÁFICO DE CRESCIMENTO MENSAL (LINHA INTEIRA) */}
      <div className="grid grid-cols-1">
        <GrowthChart 
          data={metrics.monthlyGrowthData}
          type={chartType}
          dateRange={dateRange}
          insight={metrics.insightCrescimento}
        />
      </div>
      
      {/* ÁREA VERDE - GRÁFICOS DE PIZZA LADO A LADO */}
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
