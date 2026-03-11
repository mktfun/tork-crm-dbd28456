
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Company } from '@/types';

interface CompanyWithRamosCount extends Company {
  ramos_count?: number;
}

export function useSupabaseCompanies() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // 🚀 **REACT QUERY COM OTIMIZAÇÃO E CONTAGEM DE RAMOS**
  const { data: companies = [], isLoading: loading, error } = useQuery({
    queryKey: ['companies', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Usar a view otimizada que já inclui a contagem de ramos
      const { data, error } = await supabase
        .from('companies_with_ramos_count')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }

      const formattedCompanies: CompanyWithRamosCount[] = data?.map((company: any) => ({
        id: company.id,
        name: company.name,
        service_phone: company.service_phone || '',
        assistance_phone: company.assistance_phone || '',
        createdAt: company.created_at,
        ramos_count: company.ramos_count || 0,
      })) || [];

      return formattedCompanies;
    },
    enabled: !!user,
    staleTime: 0, // ⚡️ FORÇA A REVALIDAÇÃO EM CADA VISITA
  });

  // 🎯 **MUTATIONS COM INVALIDAÇÃO AUTOMÁTICA**
  const addCompanyMutation = useMutation({
    mutationFn: async (companyData: Omit<Company, 'id' | 'createdAt'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('companies')
        .insert({
          user_id: user.id,
          name: companyData.name,
          service_phone: companyData.service_phone,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating company:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Company> }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('companies')
        .update({
          name: updates.name,
          service_phone: updates.service_phone,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating company:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('🗑️ Iniciando exclusão da seguradora:', id);

      if (!user) {
        console.error('❌ Usuário não autenticado');
        throw new Error('User not authenticated');
      }

      console.log('👤 Usuário autenticado:', user.id);

      // 1. Verificar se a seguradora existe e pertence ao usuário
      console.log('🔍 Verificando se a seguradora existe...');
      const { data: companyExists, error: companyExistsError } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (companyExistsError) {
        console.error('❌ Erro ao verificar existência da seguradora:', companyExistsError);
        throw new Error('Seguradora não encontrada ou não autorizada: ' + companyExistsError.message);
      }

      console.log('✅ Seguradora encontrada:', companyExists.name);

      // 2. Verificar dependências em 'apolices'
      console.log('🔍 Verificando apólices dependentes...');
      const { count: apolicesCount, error: apolicesError } = await supabase
        .from('apolices')
        .select('*', { count: 'exact', head: true })
        .eq('insurance_company', id)
        .eq('user_id', user.id);

      console.log('📊 Contagem de apólices:', apolicesCount, 'Erro:', apolicesError);

      if (apolicesError) {
        console.error('❌ Erro ao verificar apólices:', apolicesError);
        throw new Error('Erro ao verificar apólices: ' + apolicesError.message);
      }

      if (apolicesCount !== null && apolicesCount > 0) {
        console.log('❌ Exclusão bloqueada por apólices:', apolicesCount);
        throw new Error(`Esta seguradora não pode ser excluída pois possui ${apolicesCount} apólices ativas.`);
      }

      // 3. Verificar dependências em 'company_ramos'
      console.log('🔍 Verificando ramos associados...');
      const { count: ramosCount, error: ramosError } = await supabase
        .from('company_ramos')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', id)
        .eq('user_id', user.id);

      console.log('📊 Contagem de ramos:', ramosCount, 'Erro:', ramosError);

      if (ramosError) {
        console.error('❌ Erro ao verificar ramos:', ramosError);
        throw new Error('Erro ao verificar ramos associados: ' + ramosError.message);
      }

      if (ramosCount !== null && ramosCount > 0) {
        console.log('❌ Exclusão bloqueada por ramos:', ramosCount);
        throw new Error(`Esta seguradora não pode ser excluída pois está associada a ${ramosCount} ramos.`);
      }

      console.log('✅ Validações passaram, iniciando exclusão...');

      // 4. Executar a exclusão
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('❌ Erro na exclusão:', deleteError);
        throw new Error('Erro ao excluir seguradora: ' + deleteError.message);
      }

      console.log('✅ Seguradora excluída com sucesso!');
      return { success: true };
    },
    onSuccess: () => {
      console.log('🔄 Invalidando cache de companies...');
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
    onError: (error) => {
      console.error('❌ Erro capturado na mutation:', error);
    },
  });

  return {
    companies,
    loading,
    error,
    addCompany: addCompanyMutation.mutateAsync,
    updateCompany: (id: string, updates: Partial<Company>) =>
      updateCompanyMutation.mutateAsync({ id, updates }),
    deleteCompany: deleteCompanyMutation.mutateAsync,
    isAdding: addCompanyMutation.isPending,
    isUpdating: updateCompanyMutation.isPending,
    isDeleting: deleteCompanyMutation.isPending,
  };
}
