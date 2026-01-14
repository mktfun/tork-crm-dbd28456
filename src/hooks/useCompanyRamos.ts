import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompanyRamo {
  company_id: string;
  ramo_id: string;
  user_id: string;
  created_at: string;
}

export interface CreateCompanyRamoData {
  company_id: string;
  ramo_id: string;
}

// Hook para buscar todas as associações seguradoras-ramos do usuário
export function useCompanyRamos() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['company-ramos', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('company_ramos')
        .select(`
          *,
          companies!inner(id, name),
          ramos!inner(id, nome)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Hook para buscar ramos de uma seguradora específica
export function useCompanyRamosById(companyId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['company-ramos', companyId, user?.id],
    queryFn: async () => {
      if (!user || !companyId) return [];
      
      const { data, error } = await supabase
        .from('company_ramos')
        .select(`
          *,
          ramos!inner(id, nome)
        `)
        .eq('company_id', companyId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!companyId,
  });
}

// Hook para associar um ramo a uma seguradora
export function useCreateCompanyRamo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateCompanyRamoData) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      // Verificar se a associação já existe
      const { data: existing } = await supabase
        .from('company_ramos')
        .select('*')
        .eq('company_id', data.company_id)
        .eq('ramo_id', data.ramo_id)
        .single();
      
      if (existing) {
        throw new Error('Esta associação já existe');
      }
      
      const { data: newAssociation, error } = await supabase
        .from('company_ramos')
        .insert({
          company_id: data.company_id,
          ramo_id: data.ramo_id,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return newAssociation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-ramos'] });
      toast.success('Ramo associado à seguradora com sucesso!');
    },
    onError: (error: any) => {
      if (error.message.includes('já existe')) {
        toast.error('Esta associação já existe!');
      } else {
        toast.error('Erro ao associar ramo: ' + error.message);
      }
    },
  });
}

// Hook para remover associação ramo-seguradora
export function useDeleteCompanyRamo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ companyId, ramoId }: { companyId: string; ramoId: string }) => {
      const { error } = await supabase
        .from('company_ramos')
        .delete()
        .eq('company_id', companyId)
        .eq('ramo_id', ramoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-ramos'] });
      toast.success('Associação removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover associação: ' + error.message);
    },
  });
}

// Hook para validar se uma seguradora oferece determinado ramo
export function useValidateCompanyRamo(companyId: string | null, ramoId: string | null) {
  return useQuery({
    queryKey: ['validate-company-ramo', companyId, ramoId],
    queryFn: async () => {
      if (!companyId || !ramoId) return false;
      
      const { data, error } = await supabase.rpc('validate_company_ramo' as any, {
        company_id_param: companyId,
        ramo_id_param: ramoId
      });
      
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!companyId && !!ramoId,
  });
}

// Hook para buscar seguradoras que oferecem um ramo específico
export function useCompaniesByRamo(ramoId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['companies-by-ramo', ramoId, user?.id],
    queryFn: async () => {
      if (!user || !ramoId) return [];
      
      const { data, error } = await supabase
        .from('company_ramos')
        .select(`
          *,
          companies!inner(id, name)
        `)
        .eq('ramo_id', ramoId)
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(item => item.companies);
    },
    enabled: !!user && !!ramoId,
  });
}