import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApiKey {
  id: string;
  service_name: string;
  key_value: string;
  status: 'active' | 'inactive';
  description: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useApiKeys() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('service_name');

      if (error) throw error;
      return data as ApiKey[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newKey: Omit<ApiKey, 'id' | 'created_at' | 'updated_at' | 'last_used_at'>) => {
      const { data, error } = await supabase
        .from('api_keys')
        .insert(newKey)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API Key criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar API Key: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ApiKey> }) => {
      const { data, error } = await supabase
        .from('api_keys')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API Key atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar API Key: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API Key excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir API Key: ' + error.message);
    },
  });

  return {
    ...query,
    createApiKey: createMutation.mutate,
    updateApiKey: updateMutation.mutate,
    deleteApiKey: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
