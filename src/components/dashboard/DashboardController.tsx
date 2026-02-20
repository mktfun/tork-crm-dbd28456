import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp } from 'lucide-react';
import { DashboardChartsGrid } from './DashboardChartsGrid';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { getCurrentMonthRange } from '@/utils/dateUtils';

export function DashboardController() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getCurrentMonthRange());
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  const metrics = useDashboardMetrics({ dateRange });

  return (
    <div className="space-y-6">
      {/* Header inline — sem card separado */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Análise do Período</h2>
          <p className="text-sm text-muted-foreground">Gráficos filtráveis por período</p>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Período:</span>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-auto" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Crescimento:</span>
            <div className="flex gap-1">
              <Button variant={chartType === 'bar' ? 'default' : 'outline'} size="sm" onClick={() => setChartType('bar')} className="gap-1 h-8">
                <BarChart3 className="w-4 h-4" />
                Barras
              </Button>
              <Button variant={chartType === 'line' ? 'default' : 'outline'} size="sm" onClick={() => setChartType('line')} className="gap-1 h-8">
                <TrendingUp className="w-4 h-4" />
                Linha
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos */}
      <DashboardChartsGrid dateRange={dateRange} chartType={chartType} metrics={metrics} />
    </div>
  );
}
