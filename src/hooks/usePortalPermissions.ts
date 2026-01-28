import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PortalPermissions {
  canDownloadPolicies: boolean;
  canDownloadCards: boolean;
  canEditProfile: boolean;
  isLoading: boolean;
}

/**
 * Hook centralizado para gerenciar permissões do portal do cliente.
 * Busca as configurações da corretora uma única vez e distribui para todas as páginas.
 */
export function usePortalPermissions(): PortalPermissions {
  const [permissions, setPermissions] = useState<PortalPermissions>({
    canDownloadPolicies: true,
    canDownloadCards: true,
    canEditProfile: true,
    isLoading: true,
  });

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const storedClient = sessionStorage.getItem('portal_client');
        if (!storedClient) {
          setPermissions(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const client = JSON.parse(storedClient);
        const userId = client.user_id;

        if (!userId) {
          setPermissions(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const { data, error } = await supabase
          .from('brokerages')
          .select('portal_allow_policy_download, portal_allow_card_download, portal_allow_profile_edit')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching portal permissions:', error);
          setPermissions(prev => ({ ...prev, isLoading: false }));
          return;
        }

        setPermissions({
          canDownloadPolicies: data?.portal_allow_policy_download ?? true,
          canDownloadCards: data?.portal_allow_card_download ?? true,
          canEditProfile: data?.portal_allow_profile_edit ?? true,
          isLoading: false,
        });
      } catch (err) {
        console.error('Error in usePortalPermissions:', err);
        setPermissions(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchPermissions();
  }, []);

  return permissions;
}
