import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: any;
  active: boolean;
  created_at: string;
  updated_at: string;
  users: Array<{
    id: string;
    nome_completo: string;
    email: string;
    role: string;
    ativo: boolean;
    created_at: string;
  }>;
  crm_settings: {
    id: string;
    chatwoot_url: string | null;
    chatwoot_api_key: string | null;
    chatwoot_account_id: string | null;
    chatwoot_webhook_secret: string | null;
  } | null;
  stats: {
    total_users: number;
    active_users: number;
    total_clients: number;
    total_policies: number;
    active_policies: number;
    total_deals: number;
  };
}

export function useOrganizationDetails(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['organization-details', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');

      // Buscar organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      // Buscar usuários da organização
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, nome_completo, email, role, ativo, created_at')
        .eq('organization_id', organizationId)
        .order('nome_completo');

      if (usersError) throw usersError;

      // Buscar configurações de CRM
      const { data: crmSettings, error: crmError } = await supabase
        .from('crm_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (crmError) throw crmError;

      // Calcular estatísticas
      const userIds = users?.map(u => u.id) || [];
      const activeUsers = users?.filter(u => u.ativo).length || 0;

      let totalClients = 0;
      let totalPolicies = 0;
      let activePolicies = 0;
      let totalDeals = 0;

      if (userIds.length > 0) {
        // Contar clientes
        const { count: clientsCount } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .in('user_id', userIds);
        totalClients = clientsCount || 0;

        // Contar apólices
        const { count: policiesCount } = await supabase
          .from('apolices')
          .select('*', { count: 'exact', head: true })
          .in('user_id', userIds);
        totalPolicies = policiesCount || 0;

        // Contar apólices ativas
        const { count: activePoliciesCount } = await supabase
          .from('apolices')
          .select('*', { count: 'exact', head: true })
          .in('user_id', userIds)
          .eq('status', 'Ativa');
        activePolicies = activePoliciesCount || 0;

        // Contar deals
        const { count: dealsCount } = await supabase
          .from('crm_deals')
          .select('*', { count: 'exact', head: true })
          .in('user_id', userIds);
        totalDeals = dealsCount || 0;
      }

      return {
        ...org,
        users: users || [],
        crm_settings: crmSettings,
        stats: {
          total_users: users?.length || 0,
          active_users: activeUsers,
          total_clients: totalClients,
          total_policies: totalPolicies,
          active_policies: activePolicies,
          total_deals: totalDeals,
        },
      } as OrganizationDetails;
    },
    enabled: !!organizationId,
  });
}
