
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

interface RoleChangeAudit {
  id: string;
  user_id: string;
  old_role: string;
  new_role: string;
  changed_by: string;
  changed_at: string;
  reason?: string;
  // Join fields
  user_name?: string;
  changed_by_name?: string;
}

export function useRoleAudit() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  
  const isAdmin = profile?.role === 'admin';

  const { data: auditLogs = [], isLoading, error } = useQuery({
    queryKey: ['roleAudit'],
    queryFn: async () => {
      if (!user || !isAdmin) {
        return [];
      }

      // Use type assertion to work around the missing table in types
      const { data, error } = await (supabase as any)
        .from('role_change_audit')
        .select(`
          *,
          user:profiles!user_id(nome_completo),
          changer:profiles!changed_by(nome_completo)
        `)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Error fetching role audit logs:', error);
        throw error;
      }

      // Transform the data to include user names
      return data?.map((log: any) => ({
        ...log,
        user_name: log.user?.nome_completo || 'Usuário desconhecido',
        changed_by_name: log.changer?.nome_completo || 'Usuário desconhecido'
      })) as RoleChangeAudit[];
    },
    enabled: !!user && isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    auditLogs,
    loading: isLoading,
    error,
    canViewAudit: isAdmin
  };
}
