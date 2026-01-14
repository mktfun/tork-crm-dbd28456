import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Appointment = Tables<'appointments'>;
type AppointmentInsert = TablesInsert<'appointments'>;
type AppointmentUpdate = TablesUpdate<'appointments'>;

export function useSupabaseAppointments() {
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ['appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }
      
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
  });

  const { data: upcomingAppointments = [], isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ['appointments', 'immediate-focus'],
    queryFn: async () => {
      const now = new Date();
      const currentDateTime = now.toISOString();
      const todayDate = now.toISOString().split('T')[0];

      // Buscar agendamentos para foco imediato:
      // 1. Agendamentos pendentes de hoje em diante
      // 2. Agendamentos atrasados (pendentes que já passaram da data/hora)
      // 3. Agendamentos prioritários (se houver campo priority)
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clientes(name)
        `)
        .eq('status', 'Pendente')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('Error fetching immediate focus appointments:', error);
        throw error;
      }

      if (!data) return [];

      // Filtrar e priorizar agendamentos
      const processedAppointments = data
        .map(appointment => {
          const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
          const isOverdue = appointmentDateTime < now;
          const isToday = appointment.date === todayDate;
          const isUpcoming = appointmentDateTime >= now;
          const isPriority = appointment.priority === 'Alta' || appointment.priority === 'Urgente';

          return {
            ...appointment,
            isOverdue,
            isToday,
            isUpcoming,
            isPriority,
            sortPriority: isOverdue ? 1 : (isToday ? 2 : (isPriority ? 3 : 4))
          };
        })
        .filter(appointment => {
          // Incluir se:
          // - É atrasado (passou da data/hora mas ainda está pendente)
          // - É de hoje
          // - É prioritário
          // - É dos próximos dias
          return appointment.isOverdue ||
                 appointment.isToday ||
                 appointment.isPriority ||
                 appointment.isUpcoming;
        })
        .sort((a, b) => {
          // Ordenar por prioridade: atrasados primeiro, depois hoje, depois prioritários, depois futuros
          if (a.sortPriority !== b.sortPriority) {
            return a.sortPriority - b.sortPriority;
          }
          // Dentro da mesma prioridade, ordenar por data e hora
          const dateCompare = new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
          return dateCompare;
        })
        .slice(0, 8); // Aumentar limite para incluir mais agendamentos relevantes

      return processedAppointments;
    },
    staleTime: 30 * 1000, // 30 segundos
  });

  const { data: weeklyStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['appointments', 'weekly-stats'],
    queryFn: async () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const { data, error } = await supabase
        .from('appointments')
        .select('status')
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0]);
      
      if (error) {
        console.error('Error fetching weekly stats:', error);
        throw error;
      }

      const total = data.length;
      const realizados = data.filter(apt => apt.status === 'Realizado').length;
      const cancelados = data.filter(apt => apt.status === 'Cancelado').length;
      const pendentes = data.filter(apt => apt.status === 'Pendente').length;
      const taxaComparecimento = total > 0 ? Math.round((realizados / total) * 100) : 0;

      return {
        total,
        realizados,
        cancelados,
        pendentes,
        taxaComparecimento
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const { data: scheduleGaps = [], isLoading: isLoadingGaps } = useQuery({
    queryKey: ['appointments', 'schedule-gaps'],
    queryFn: async () => {
      const now = new Date();
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);

      const { data, error } = await supabase
        .from('appointments')
        .select('date, time')
        .eq('status', 'Pendente')
        .gte('date', now.toISOString().split('T')[0])
        .lte('date', nextWeek.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true });
      
      if (error) {
        console.error('Error fetching schedule gaps:', error);
        throw error;
      }

      const gaps = [];
      const today = new Date();
      
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const morningAppts = data.filter(apt => 
          apt.date === dateStr && 
          apt.time >= '06:00:00' && 
          apt.time <= '12:00:00'
        );

        if (morningAppts.length === 0) {
          const dayName = checkDate.toLocaleDateString('pt-BR', { weekday: 'long' });
          gaps.push({
            type: 'morning',
            date: dateStr,
            dateObject: new Date(checkDate),
            description: `Manhã livre na ${dayName}. Hora de prospectar?`,
            period: 'Manhã (6h-12h)'
          });
        }

        const afternoonAppts = data.filter(apt => 
          apt.date === dateStr && 
          apt.time >= '13:00:00' && 
          apt.time <= '18:00:00'
        );

        if (afternoonAppts.length === 0) {
          const dayName = checkDate.toLocaleDateString('pt-BR', { weekday: 'long' });
          gaps.push({
            type: 'afternoon',
            date: dateStr,
            dateObject: new Date(checkDate),
            description: `Tarde livre na ${dayName}. Que tal visitas?`,
            period: 'Tarde (13h-18h)'
          });
        }
      }

      return gaps.slice(0, 3); // Máximo 3 sugestões
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  const addAppointmentMutation = useMutation({
    mutationFn: async (appointment: Omit<AppointmentInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointment,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: AppointmentUpdate }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating appointment:', error);
        throw error;
      }

      return data;
    },
    // Quando um agendamento for concluído/cancelado, remover notificações relacionadas
    onSuccess: async (_data, variables) => {
      try {
        const status = (variables?.updates as any)?.status;
        if (status === 'Realizado' || status === 'Cancelado') {
          await supabase
            .from('notifications')
            .delete()
            .eq('appointment_id', variables.id);
          // Atualizar lista de notificações
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      } catch (e) {
        console.error('Erro ao limpar notificações do agendamento:', e);
      } finally {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting appointment:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  return {
    appointments,
    upcomingAppointments,
    weeklyStats,
    scheduleGaps,
    loading: isLoading,
    isLoadingUpcoming,
    isLoadingStats,
    isLoadingGaps,
    error,
    addAppointment: addAppointmentMutation.mutateAsync,
    updateAppointment: (id: string, updates: AppointmentUpdate) => 
      updateAppointmentMutation.mutateAsync({ id, updates }),
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    isAdding: addAppointmentMutation.isPending,
    isUpdating: updateAppointmentMutation.isPending,
    isDeleting: deleteAppointmentMutation.isPending,
  };
}
