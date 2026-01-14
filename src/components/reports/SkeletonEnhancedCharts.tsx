
import { Skeleton } from '@/components/ui/skeleton';
import { GlassCard } from '@/components/ui/glass-card';

export function SkeletonEnhancedCharts() {
  return (
    <div className="flex flex-col gap-6">
      {/* Gráfico Principal */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
        </div>
        
        <div className="h-80 flex items-center justify-center">
          <div className="space-y-4 w-full">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-4/6" />
            <Skeleton className="h-6 w-3/6" />
            <Skeleton className="h-6 w-5/6" />
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </GlassCard>

      {/* Carrossel de Gráficos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        
        <div className="flex gap-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <GlassCard key={index} className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-56" />
                </div>
              </div>
              
              <div className="h-64 flex items-center justify-center">
                <div className="space-y-3 w-full">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-4/5" />
                  <Skeleton className="h-6 w-3/5" />
                  <Skeleton className="h-6 w-2/5" />
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Placeholder final */}
      <GlassCard className="p-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="p-4 rounded-lg bg-slate-800/30 space-y-2">
                <Skeleton className="w-12 h-12 rounded-lg mx-auto" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
