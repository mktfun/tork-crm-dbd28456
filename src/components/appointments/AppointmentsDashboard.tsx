
import { useState } from 'react';
import { ChevronRight, ChevronLeft, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UpcomingAppointmentsCard } from './UpcomingAppointmentsCard';
import { SmartSuggestionsCard } from './SmartSuggestionsCard';
import { ColorLegend } from './ColorLegend';
import { cn } from '@/lib/utils';

interface AppointmentsDashboardProps {
  upcomingAppointments: any[];
  scheduleGaps: any[];
  onViewAppointmentDetails: (appointmentId: string) => void;
  onScheduleAtDate: (date: Date) => void;
  className?: string;
  isLoadingUpcoming?: boolean;
  isLoadingGaps?: boolean;
}

export function AppointmentsDashboard({
  upcomingAppointments,
  scheduleGaps,
  onViewAppointmentDetails,
  onScheduleAtDate,
  className,
  isLoadingUpcoming,
  isLoadingGaps
}: AppointmentsDashboardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div 
      className={cn(
        "relative transition-all duration-300 ease-out",
        isCollapsed ? "w-16" : "w-80",
        className
      )}
    >
      {/* Toggle Button */}
      <Button
        onClick={toggleCollapse}
        variant="ghost"
        size="sm"
        className={cn(
          "absolute top-4 z-10 h-8 w-8 p-0",
          "bg-white/10 hover:bg-white/20 border border-white/20",
          "text-white/70 hover:text-white",
          isCollapsed ? "left-4" : "right-4"
        )}
      >
        {isCollapsed ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {/* Sidebar Content */}
      <div 
        className={cn(
          "h-full transition-all duration-300 ease-out",
          isCollapsed && "opacity-0 pointer-events-none"
        )}
      >
        {!isCollapsed && (
          <div className="p-4 space-y-6 h-full overflow-y-auto scrollbar-thin">
            {/* Header do Painel */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
                <Command className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Painel de Comando</h2>
                <p className="text-sm text-white/60">Gestão inteligente da agenda</p>
              </div>
            </div>

            {/* Tabs do Painel */}
            <Tabs defaultValue="proximos" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 border-white/20">
                <TabsTrigger 
                  value="proximos"
                  className="text-white/70 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300"
                >
                  Próximos
                </TabsTrigger>
                <TabsTrigger 
                  value="oportunidades"
                  className="text-white/70 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-300"
                >
                  Oportunidades
                </TabsTrigger>
              </TabsList>

              <TabsContent value="proximos" className="mt-6">
                <UpcomingAppointmentsCard
                  appointments={upcomingAppointments}
                  onViewDetails={onViewAppointmentDetails}
                  isLoading={isLoadingUpcoming}
                />
              </TabsContent>

              <TabsContent value="oportunidades" className="mt-6">
                <SmartSuggestionsCard
                  scheduleGaps={scheduleGaps}
                  onScheduleAtDate={onScheduleAtDate}
                  isLoading={isLoadingGaps}
                />
              </TabsContent>
            </Tabs>

            {/* Legenda de Cores */}
            <ColorLegend />

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-white/10">
              <div className="text-center">
                <p className="text-xs text-white/50">
                  🚀 Painel de Comando Ativo
                </p>
                <p className="text-xs text-white/30 mt-1">
                  Otimizando sua produtividade
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapsed State */}
      {isCollapsed && (
        <div className="p-4 flex flex-col items-center gap-4">
          <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
            <Command className="w-5 h-5 text-blue-400" />
          </div>
          
          {/* Mini indicators */}
          <div className="space-y-2">
            <div className="w-2 h-2 bg-blue-400/60 rounded-full"></div>
            <div className="w-2 h-2 bg-yellow-400/60 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}
