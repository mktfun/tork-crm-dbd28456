import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook para ouvir mudanças em tempo real na tabela de clientes
 * Invalida automaticamente o cache do React Query quando detecta alterações
 */
export function useRealtimeClients() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('🔴 Configurando listener Realtime para clientes...');

    const channel = supabase
      .channel('realtime-clients')
      .on(
        'postgres_changes',
        { 
          event: '*', // Ouvir INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'clientes',
          filter: `user_id=eq.${user.id}` // OTIMIZAÇÃO: Só ouvir mudanças do usuário atual
        },
        (payload) => {
          console.log('🔴 Mudança no banco detectada:', payload);
          
          // OTIMIZAÇÃO: Invalidação granular baseada no tipo de evento
          switch (payload.eventType) {
            case 'INSERT':
              console.log('🟢 Novo cliente criado, invalidando cache...');
              break;
            case 'UPDATE':
              console.log('🟡 Cliente atualizado, invalidando cache...');
              break;
            case 'DELETE':
              console.log('🔴 Cliente removido, invalidando cache...');
              break;
          }
          
          // Invalida as queries de clientes, forçando a UI a buscar os dados mais recentes
          queryClient.invalidateQueries({ queryKey: ['clients'] });
          queryClient.invalidateQueries({ queryKey: ['all-clients'] });
          queryClient.invalidateQueries({ queryKey: ['crm-deals'] });
        }
      )
      .subscribe((status) => {
        console.log('🔴 Status do Realtime:', status);
      });
      
    // Limpeza ao desmontar o componente
    return () => {
      console.log('🔴 Removendo listener Realtime...');
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);
}