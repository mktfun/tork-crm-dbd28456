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
    queryFn: async (): Promise<OrganizationDetails | null> => {
      if (!organizationId) return null;

      try {
        // Por enquanto, usamos brokerages como fallback
        const { data: brokerage, error: brokerageError } = await supabase
          .from('brokerages')
          .select('*')
          .eq('id', parseInt(organizationId))
          .single();

        if (brokerageError) {
          console.warn('Brokerage not found:', brokerageError.message);
          return null;
        }

        // Buscar usuários associados (via user_id do brokerage)
        const { data: users, error: usersError } = await supabase
          .from('profiles')
          .select('id, nome_completo, email, role, ativo, created_at')
          .eq('id', brokerage.user_id);

        if (usersError) {
          console.warn('Error fetching users:', usersError.message);
        }

        // Buscar configurações de CRM
        const { data: crmSettings, error: crmError } = await supabase
          .from('crm_settings')
          .select('*')
          .eq('user_id', brokerage.user_id)
          .maybeSingle();

        if (crmError) {
          console.warn('Error fetching CRM settings:', crmError.message);
        }

        // Contar clientes
        const { count: clientsCount } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', brokerage.user_id);

        // Contar apólices
        const { count: policiesCount } = await supabase
          .from('apolices')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', brokerage.user_id);

        // Contar apólices ativas
        const { count: activePoliciesCount } = await supabase
          .from('apolices')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', brokerage.user_id)
          .eq('status', 'Ativa');

        // Contar deals
        const { count: dealsCount } = await supabase
          .from('crm_deals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', brokerage.user_id);

        const usersList = users || [];

        return {
          id: String(brokerage.id),
          name: brokerage.name,
          slug: brokerage.slug,
          logo_url: brokerage.logo_url,
          settings: {},
          active: true,
          created_at: brokerage.created_at,
          updated_at: brokerage.updated_at,
          users: usersList.map(u => ({
            id: u.id,
            nome_completo: u.nome_completo || '',
            email: u.email || '',
            role: u.role || 'corretor',
            ativo: u.ativo ?? true,
            created_at: u.created_at,
          })),
          crm_settings: crmSettings ? {
            id: crmSettings.id,
            chatwoot_url: crmSettings.chatwoot_url,
            chatwoot_api_key: crmSettings.chatwoot_api_key,
            chatwoot_account_id: crmSettings.chatwoot_account_id,
            chatwoot_webhook_secret: crmSettings.chatwoot_webhook_secret,
          } : null,
          stats: {
            total_users: usersList.length,
            active_users: usersList.filter(u => u.ativo).length,
            total_clients: clientsCount || 0,
            total_policies: policiesCount || 0,
            active_policies: activePoliciesCount || 0,
            total_deals: dealsCount || 0,
          },
        };
      } catch (error) {
        console.error('Error fetching organization details:', error);
        return null;
      }
    },
    enabled: !!organizationId,
    retry: false,
  });
}
