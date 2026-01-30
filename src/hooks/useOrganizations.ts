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
      // A tabela organizations pode não existir ainda
      // Por enquanto, retornamos os dados da tabela brokerages como fallback
      try {
        const { data: brokerages, error } = await supabase
          .from('brokerages')
          .select('*')
          .order('name');

        if (error) {
          console.warn('Error fetching organizations:', error.message);
          return [] as Organization[];
        }

        // Converte brokerages para o formato Organization
        const orgs: Organization[] = (brokerages || []).map(b => ({
          id: String(b.id),
          name: b.name,
          slug: b.slug,
          logo_url: b.logo_url,
          settings: {},
          active: true,
          created_at: b.created_at,
          updated_at: b.updated_at,
          _count: {
            users: 0,
            policies: 0,
          }
        }));

        return orgs;
      } catch (error) {
        console.error('Error in useOrganizations:', error);
        return [] as Organization[];
      }
    },
    retry: false,
  });
}
