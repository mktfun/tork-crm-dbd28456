import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    queryFn: async (): Promise<ApiKey[]> => {
      // A tabela api_keys não existe ainda no schema
      // Retornamos array vazio até que a migração seja aplicada
      console.warn('api_keys table not available - returning empty data');
      return [];
    },
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (newKey: Omit<ApiKey, 'id' | 'created_at' | 'updated_at' | 'last_used_at'>) => {
      throw new Error('Funcionalidade ainda não disponível. Execute as migrações primeiro.');
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
      throw new Error('Funcionalidade ainda não disponível. Execute as migrações primeiro.');
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
      throw new Error('Funcionalidade ainda não disponível. Execute as migrações primeiro.');
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
