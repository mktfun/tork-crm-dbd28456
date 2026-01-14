
import { AppCard } from '@/components/ui/app-card';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonMetricas() {
  return (
    <AppCard className="p-6">
      <div className="mb-6">
        <Skeleton className="h-6 w-48 mb-2 bg-slate-700" />
        <Skeleton className="h-4 w-72 bg-slate-700" />
      </div>

      {/* Métricas Principais Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="relative overflow-hidden rounded-lg bg-slate-800 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2 bg-slate-700" />
                <Skeleton className="h-8 w-32 mb-1 bg-slate-700" />
                <Skeleton className="h-3 w-28 bg-slate-700" />
              </div>
              <Skeleton className="w-12 h-12 rounded-lg bg-slate-700" />
            </div>
          </div>
        ))}
      </div>

      {/* Detalhamento por Status Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[...Array(2)].map((_, index) => (
          <div key={index} className="p-4 rounded-lg bg-slate-800 border-l-4 border-slate-600">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24 mb-2 bg-slate-700" />
                <Skeleton className="h-6 w-16 bg-slate-700" />
              </div>
              <Skeleton className="h-8 w-12 bg-slate-700" />
            </div>
          </div>
        ))}
      </div>

      {/* Métricas Adicionais Skeleton */}
      <div className="pt-6 border-t border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="p-4 rounded-lg bg-slate-800">
              <Skeleton className="h-4 w-32 mb-2 bg-slate-700" />
              <Skeleton className="h-8 w-20 mb-1 bg-slate-700" />
              <Skeleton className="h-3 w-36 bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    </AppCard>
  );
}
