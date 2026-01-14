import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ClientWithStats {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf_cnpj?: string;
  user_id: string;
  created_at: string;
  status: string;
  total_policies: number;
  total_premium: number;
  total_commission: number;
  active_policies: number;
  budget_policies: number;
}

export function useClientsWithStats() {
  return useQuery({
    queryKey: ['clients-with-stats'],
    queryFn: async (): Promise<ClientWithStats[]> => {
      const { data, error } = await supabase.rpc('get_clients_with_stats');
      
      if (error) {
        console.error('Erro ao buscar clientes com estatísticas:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}