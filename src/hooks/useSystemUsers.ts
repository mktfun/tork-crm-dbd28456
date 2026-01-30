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
      // Query simples sem join com organizations (tabela pode não existir)
      let query = supabase
        .from('profiles')
        .select(`
          id,
          nome_completo,
          email,
          telefone,
          role,
          ativo,
          created_at
        `)
        .order('nome_completo');

      if (organizationId) {
        // Filtrar por organization_id se a coluna existir
        // Por enquanto, retornamos todos os usuários
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching system users:', error);
        return [];
      }

      // Mapeia para o formato esperado (sem organization por enquanto)
      const users: SystemUser[] = (data || []).map(profile => ({
        id: profile.id,
        nome_completo: profile.nome_completo || '',
        email: profile.email || '',
        telefone: profile.telefone || null,
        role: profile.role || 'corretor',
        ativo: profile.ativo ?? true,
        created_at: profile.created_at,
        organization: null, // Será implementado quando a tabela organizations existir
      }));

      return users;
    },
    retry: false,
  });
}
