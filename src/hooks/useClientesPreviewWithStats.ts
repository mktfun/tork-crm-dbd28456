import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface PreviewFilters {
  seguradoraId?: string | null;
  ramo?: string | null;
}

interface ClientWithStatsPreview {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  total_policies: number;
  total_premium: number;
  total_commission: number;
  active_policies: number;
  budget_policies: number;
  total_records: number;
}

export function useClientesPreviewWithStats(filters: PreviewFilters) {
  const { user } = useAuth();
  const isFilterActive = Boolean(filters?.seguradoraId || filters?.ramo);

  return useQuery({
    queryKey: ['clientes-preview-with-stats', user?.id, filters],
    queryFn: async (): Promise<ClientWithStatsPreview[]> => {
      if (!user) return [];
      
      // Buscar da view clients_with_stats com filtros
      let query = supabase
        .from('clients_with_stats')
        .select('*');

      // Aplicar filtros se necessário
      if (filters?.seguradoraId || filters?.ramo) {
        // Para filtrar por seguradora/ramo, precisamos fazer join com apólices
        // mas isso já está na view, então vamos filtrar pelos clientes que têm apólices
        // com os critérios especificados
        
        const { data: apolicesIds } = await supabase
          .from('apolices')
          .select('client_id')
          .eq('user_id', user.id)
          .eq(filters?.seguradoraId ? 'insurance_company' : 'type', 
              filters?.seguradoraId || filters?.ramo);
              
        if (apolicesIds && apolicesIds.length > 0) {
          const clientIds = apolicesIds.map(a => a.client_id);
          query = query.in('id', clientIds);
        } else {
          return [];
        }
      }

      const { data, error } = await query
        .order('total_commission', { ascending: false })
        .limit(10); // Limitar para preview

      if (error) {
        console.error('Erro ao buscar clientes com estatísticas:', error);
        throw error;
      }

      // Adicionar total_records a cada item para compatibilidade com PreviewCard
      const dataWithTotal = (data || []).map(item => ({
        ...item,
        total_records: data?.length || 0
      }));

      return dataWithTotal;
    },
    enabled: !!user && isFilterActive,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}