import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface PreviewFilters {
  seguradoraId?: string | null;
  ramo?: string | null;
}

export function useClientesPreview(filters: PreviewFilters) {
  const { user } = useAuth();
  const isFilterActive = Boolean(filters?.seguradoraId || filters?.ramo);

  return useQuery({
    queryKey: ['clientes-preview', user?.id, filters],
    queryFn: async () => {
      if (!user) return [] as any[];
      const { data, error } = await supabase.rpc('preview_clientes_filtrados' as any, {
        p_user_id: user.id,
        p_seguradora_id: filters?.seguradoraId || null,
        p_ramo: filters?.ramo || null,
      });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!user && isFilterActive,
  });
}
