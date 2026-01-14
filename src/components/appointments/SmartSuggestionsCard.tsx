
import { Lightbulb, TrendingUp, Clock, Calendar, Plus } from 'lucide-react';
import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ScheduleGap {
  type: string;
  date: string;
  dateObject: Date;
  description: string;
  period: string;
}

interface SmartSuggestionsCardProps {
  scheduleGaps: ScheduleGap[];
  onScheduleAtDate: (date: Date) => void;
  isLoading?: boolean;
}

export function SmartSuggestionsCard({ 
  scheduleGaps, 
  onScheduleAtDate, 
  isLoading 
}: SmartSuggestionsCardProps) {
  if (isLoading) {
    return (
      <AppCard className="h-fit">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-lg bg-white/10" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 bg-white/10" />
            <Skeleton className="h-4 w-32 bg-white/5" />
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-white/5">
              <div className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-md bg-white/10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20 bg-white/10" />
                  <Skeleton className="h-4 w-full bg-white/5" />
                  <Skeleton className="h-8 w-20 bg-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard className="h-fit">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-yellow-500/20 rounded-lg">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Oportunidades na Agenda</h3>
          <p className="text-sm text-white/60">Insights inteligentes</p>
        </div>
      </div>

      {scheduleGaps.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-white/40" />
          </div>
          <p className="text-white/60 text-sm">Agenda bem preenchida!</p>
          <p className="text-white/40 text-xs mt-1">Nenhuma oportunidade detectada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scheduleGaps.map((gap, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 hover:border-yellow-500/30 transition-all duration-200"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-yellow-500/20 rounded-md flex-shrink-0 mt-0.5">
                  {gap.type === 'morning' ? (
                    <Calendar className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant="secondary"
                      className="bg-yellow-500/20 text-yellow-300 text-xs"
                    >
                      {gap.period}
                    </Badge>
                  </div>
                  
                  <p className="text-white/90 text-sm leading-relaxed mb-3">
                    {gap.description}
                  </p>

                  <Button
                    size="sm"
                    onClick={() => onScheduleAtDate(gap.dateObject)}
                    className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 hover:text-yellow-200 border border-yellow-500/40 hover:border-yellow-500/60 transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agendar
                  </Button>
                </div>
              </div>
              
              {index < scheduleGaps.length - 1 && (
                <div className="mt-3 h-px bg-yellow-500/20" />
              )}
            </div>
          ))}
        </div>
      )}

      {scheduleGaps.length > 0 && (
        <div className="mt-4 p-2 bg-white/5 rounded-lg">
          <p className="text-xs text-white/50 text-center">
            💡 Aproveite esses intervalos para maximizar sua produtividade
          </p>
        </div>
      )}
    </AppCard>
  );
}
