
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { CompanyBranch } from '@/types';

export function useSupabaseCompanyBranches() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // 🚀 **REACT QUERY COM OTIMIZAÇÃO**
  const { data: companyBranches = [], isLoading: loading, error } = useQuery({
    queryKey: ['company-branches', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('company_branches')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching company branches:', error);
        throw error;
      }

      const formattedBranches: CompanyBranch[] = data?.map((branch: any) => ({
        id: branch.id,
        companyId: branch.company_id,
        name: branch.name,
        createdAt: branch.created_at,
      })) || [];

      return formattedBranches;
    },
    enabled: !!user,
    // 🚀 **OTIMIZAÇÃO DE PERFORMANCE**
    staleTime: 15 * 60 * 1000, // 15 minutos
  });

  // 🎯 **MUTATIONS COM INVALIDAÇÃO AUTOMÁTICA**
  const addCompanyBranchMutation = useMutation({
    mutationFn: async (branchData: Omit<CompanyBranch, 'id' | 'createdAt'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('company_branches')
        .insert({
          user_id: user.id,
          company_id: branchData.companyId,
          name: branchData.name,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating company branch:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
    },
  });

  const updateCompanyBranchMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CompanyBranch> }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('company_branches')
        .update({
          company_id: updates.companyId,
          name: updates.name,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating company branch:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
    },
  });

  const deleteCompanyBranchMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('company_branches')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting company branch:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
    },
  });

  return {
    companyBranches,
    loading,
    error,
    addCompanyBranch: addCompanyBranchMutation.mutateAsync,
    updateCompanyBranch: (id: string, updates: Partial<CompanyBranch>) => 
      updateCompanyBranchMutation.mutateAsync({ id, updates }),
    deleteCompanyBranch: deleteCompanyBranchMutation.mutateAsync,
    isAdding: addCompanyBranchMutation.isPending,
    isUpdating: updateCompanyBranchMutation.isPending,
    isDeleting: deleteCompanyBranchMutation.isPending,
  };
}
