import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Brokerage {
  id: number;
  name: string;
  slug: string;
  cnpj: string | null;
  susep_code: string | null;
  logo_url: string | null;
  portal_enabled: boolean | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useBrokeragesAdmin() {
  return useQuery({
    queryKey: ['admin-brokerages'],
    queryFn: async (): Promise<Brokerage[]> => {
      const { data, error } = await supabase
        .from('brokerages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateBrokerage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: number; 
      updates: Omit<Partial<Brokerage>, 'id'> 
    }) => {
      const { data, error } = await supabase
        .from('brokerages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brokerages'] });
      toast.success('Corretora atualizada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar corretora: ' + error.message);
    },
  });
}

export function useImpersonateBrokerage() {
  const startImpersonation = (brokerageId: number, brokerageName: string) => {
    localStorage.setItem('impersonated_brokerage_id', String(brokerageId));
    localStorage.setItem('impersonated_brokerage_name', brokerageName);
    toast.success(`Personificando: ${brokerageName}`);
    window.location.href = '/dashboard';
  };

  const stopImpersonation = () => {
    localStorage.removeItem('impersonated_brokerage_id');
    localStorage.removeItem('impersonated_brokerage_name');
    toast.info('Personificação encerrada');
    window.location.reload();
  };

  const isImpersonating = () => {
    return !!localStorage.getItem('impersonated_brokerage_id');
  };

  const getImpersonatedBrokerage = () => {
    return {
      id: localStorage.getItem('impersonated_brokerage_id'),
      name: localStorage.getItem('impersonated_brokerage_name'),
    };
  };

  return {
    startImpersonation,
    stopImpersonation,
    isImpersonating,
    getImpersonatedBrokerage,
  };
}
