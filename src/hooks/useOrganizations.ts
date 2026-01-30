import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: any;
  active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    users: number;
    policies: number;
  };
}

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;

      // Buscar contagem de usuários e apólices para cada organização
      const orgsWithCounts = await Promise.all(
        (data || []).map(async (org) => {
          // Contar usuários
          const { count: usersCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Contar apólices (via usuários da organização)
          const { data: orgUsers } = await supabase
            .from('profiles')
            .select('id')
            .eq('organization_id', org.id);

          const userIds = orgUsers?.map(u => u.id) || [];
          
          let policiesCount = 0;
          if (userIds.length > 0) {
            const { count } = await supabase
              .from('apolices')
              .select('*', { count: 'exact', head: true })
              .in('user_id', userIds);
            policiesCount = count || 0;
          }

          return {
            ...org,
            _count: {
              users: usersCount || 0,
              policies: policiesCount,
            },
          };
        })
      );

      return orgsWithCounts as Organization[];
    },
  });
}
