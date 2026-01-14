import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Ramo } from './useSupabaseRamos';

export function useRamosByCompany(companyId: string | null) {
  return useQuery({
    queryKey: ['ramos-by-company', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      // Busca os IDs dos ramos na tabela de associação
      const { data: companyRamos, error: companyRamosError } = await supabase
        .from('company_ramos')
        .select('ramo_id')
        .eq('company_id', companyId);

      if (companyRamosError) {
        throw new Error('Erro ao buscar associações de ramos: ' + companyRamosError.message);
      }

      if (!companyRamos || companyRamos.length === 0) {
        return []; // Seguradora não tem ramos associados
      }

      const ramoIds = companyRamos.map(r => r.ramo_id);

      // Busca os detalhes dos ramos encontrados
      const { data: ramos, error: ramosError } = await supabase
        .from('ramos')
        .select('*')
        .in('id', ramoIds);

      if (ramosError) {
        throw new Error('Erro ao buscar detalhes dos ramos: ' + ramosError.message);
      }

      return ramos as Ramo[] || [];
    },
    enabled: !!companyId,
  });
}