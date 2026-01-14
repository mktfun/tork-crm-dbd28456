
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { TransactionType } from '@/types';

export function useSupabaseTransactionTypes() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // 🚀 **REACT QUERY COM OTIMIZAÇÃO**
  const { data: transactionTypes = [], isLoading: loading, error } = useQuery({
    queryKey: ['transaction-types', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('transaction_types')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching transaction types:', error);
        throw error;
      }

      const formattedTypes: TransactionType[] = data?.map((type: any) => ({
        id: type.id,
        name: type.name,
        nature: type.nature as TransactionType['nature'],
        createdAt: type.created_at,
      })) || [];

      return formattedTypes;
    },
    enabled: !!user,
    // 🚀 **OTIMIZAÇÃO DE PERFORMANCE** - Tipos não mudam muito
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  // 🎯 **MUTATIONS COM INVALIDAÇÃO AUTOMÁTICA**
  const addTransactionTypeMutation = useMutation({
    mutationFn: async (typeData: Omit<TransactionType, 'id' | 'createdAt'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('transaction_types')
        .insert({
          user_id: user.id,
          name: typeData.name,
          nature: typeData.nature,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating transaction type:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-types'] });
    },
  });

  const updateTransactionTypeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TransactionType> }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('transaction_types')
        .update({
          name: updates.name,
          nature: updates.nature,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction type:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-types'] });
    },
  });

  const deleteTransactionTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('transaction_types')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting transaction type:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-types'] });
    },
  });

  return {
    transactionTypes,
    loading,
    error,
    addTransactionType: addTransactionTypeMutation.mutateAsync,
    updateTransactionType: (id: string, updates: Partial<TransactionType>) => 
      updateTransactionTypeMutation.mutateAsync({ id, updates }),
    deleteTransactionType: deleteTransactionTypeMutation.mutateAsync,
    isAdding: addTransactionTypeMutation.isPending,
    isUpdating: updateTransactionTypeMutation.isPending,
    isDeleting: deleteTransactionTypeMutation.isPending,
  };
}
