
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Producer } from '@/types';

export function useSupabaseProducers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // 🚀 **REACT QUERY COM OTIMIZAÇÃO**
  const { data: producers = [], isLoading: loading, error } = useQuery({
    queryKey: ['producers', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('producers')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching producers:', error);
        throw error;
      }

      const formattedProducers: Producer[] = data?.map((producer: any) => ({
        id: producer.id,
        name: producer.name,
        email: producer.email,
        phone: producer.phone,
        cpfCnpj: producer.cpf_cnpj,
        companyName: producer.company_name,
        brokerage_id: producer.brokerage_id,
        createdAt: producer.created_at,
      })) || [];

      return formattedProducers;
    },
    enabled: !!user,
    // 🚀 **OTIMIZAÇÃO DE PERFORMANCE**
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // 🎯 **MUTATIONS COM INVALIDAÇÃO AUTOMÁTICA**
  const addProducerMutation = useMutation({
    mutationFn: async (producerData: Omit<Producer, 'id' | 'createdAt'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('producers')
        .insert({
          user_id: user.id,
          name: producerData.name,
          email: producerData.email || null,
          phone: producerData.phone || null,
          cpf_cnpj: producerData.cpfCnpj || null,
          company_name: producerData.companyName || null,
          brokerage_id: producerData.brokerage_id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating producer:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producers'] });
    },
  });

  const updateProducerMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Producer> }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('producers')
        .update({
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          cpf_cnpj: updates.cpfCnpj,
          company_name: updates.companyName,
          brokerage_id: updates.brokerage_id,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating producer:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producers'] });
    },
  });

  const deleteProducerMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('producers')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting producer:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['producers'] });
    },
  });

  return {
    producers,
    loading,
    error,
    addProducer: addProducerMutation.mutateAsync,
    updateProducer: (id: string, updates: Partial<Producer>) => 
      updateProducerMutation.mutateAsync({ id, updates }),
    deleteProducer: deleteProducerMutation.mutateAsync,
    isAdding: addProducerMutation.isPending,
    isUpdating: updateProducerMutation.isPending,
    isDeleting: deleteProducerMutation.isPending,
  };
}
