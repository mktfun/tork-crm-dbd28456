import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SystemUser {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string | null;
  role: string;
  ativo: boolean;
  created_at: string;
  organization: {
    id: string;
    name: string;
  } | null;
}

export function useSystemUsers(organizationId?: string) {
  return useQuery({
    queryKey: ['system-users', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          nome_completo,
          email,
          telefone,
          role,
          ativo,
          created_at,
          organization:organizations(id, name)
        `)
        .order('nome_completo');

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as SystemUser[];
    },
  });
}
