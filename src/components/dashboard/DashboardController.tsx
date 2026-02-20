import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { DashboardChartsGrid } from './DashboardChartsGrid';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { getCurrentMonthRange } from '@/utils/dateUtils';

export function DashboardController() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(getCurrentMonthRange());

  const metrics = useDashboardMetrics({ dateRange });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Análise do Período</h2>
          <p className="text-sm text-muted-foreground">Gráficos filtráveis por período</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-auto" />
        </div>
      </div>

      <DashboardChartsGrid dateRange={dateRange} metrics={metrics} />
    </div>
  );
}
