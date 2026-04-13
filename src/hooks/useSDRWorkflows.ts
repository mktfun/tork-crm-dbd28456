import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface SDRWorkflow {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  nodes: any[];
  edges: any[];
  trigger_config: any;
  created_at?: string;
  updated_at?: string;
}

export function useSDRWorkflows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['sdr-workflows', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase
        .from('crm_sdr_workflows' as any)
        .select('*') as any);

      if (error) throw error;
      return data as SDRWorkflow[];
    },
    enabled: !!user,
  });

  const upsertWorkflow = useMutation({
    mutationFn: async (workflow: Partial<SDRWorkflow>) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('crm_sdr_workflows' as any)
        .upsert({
          ...workflow,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        } as any)
        .select()
        .single() as any);

      if (error) throw error;
      return data as SDRWorkflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-workflows'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar workflow: ${error.message}`);
    },
  });

  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_sdr_workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-workflows'] });
      toast.success('Workflow excluído com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir workflow: ${error.message}`);
    },
  });

  return {
    workflows,
    isLoading,
    upsertWorkflow,
    deleteWorkflow,
  };
}
