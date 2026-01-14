
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/ui/glass-card';

export function SkeletonKpiReports() {
  return (
    <GlassCard className="p-6">
      <div className="mb-6">
        <Skeleton className="h-6 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="relative overflow-hidden rounded-lg bg-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="w-12 h-12 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Detalhamento por Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="p-4 rounded-lg bg-slate-800 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Métricas Adicionais */}
      <div className="pt-6 border-t border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="p-4 rounded-lg bg-slate-800 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-48" />
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
