import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Ramo {
  id: string;
  nome: string;
  user_id: string;
  created_at: string;
}

export interface CreateRamoData {
  nome: string;
}

// Hook para buscar todos os ramos do usuário
export function useSupabaseRamos() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ramos', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('ramos')
        .select('*')
        .eq('user_id', user.id)
        .order('nome');
      
      if (error) throw error;
      return data as Ramo[];
    },
    enabled: !!user,
    staleTime: 0, // ⚡️ FORÇA A REVALIDAÇÃO EM CADA VISITA
  });
}

// Hook para criar um novo ramo
export function useCreateRamo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateRamoData) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data: newRamo, error } = await supabase
        .from('ramos')
        .insert({
          nome: data.nome,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return newRamo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramos'] });
      toast.success('Ramo criado com sucesso!');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Este ramo já existe!');
      } else {
        toast.error('Erro ao criar ramo: ' + error.message);
      }
    },
  });
}

// Hook para atualizar um ramo
export function useUpdateRamo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateRamoData> }) => {
      const { data: updatedRamo, error } = await supabase
        .from('ramos')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updatedRamo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramos'] });
      toast.success('Ramo atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar ramo: ' + error.message);
    },
  });
}

// Hook para deletar um ramo
export function useDeleteRamo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Verificar dependências em 'apolices'
      const { count: apolicesCount, error: apolicesError } = await supabase
        .from('apolices')
        .select('*', { count: 'exact', head: true })
        .eq('ramo_id', id)
        .eq('user_id', user.id);

      if (apolicesError) throw new Error('Erro ao verificar apólices: ' + apolicesError.message);
      if (apolicesCount && apolicesCount > 0) {
        throw new Error(`Este ramo não pode ser excluído pois está em uso por ${apolicesCount} apólices.`);
      }

      // 2. Verificar dependências em 'company_ramos'
      const { count: companiesCount, error: companiesError } = await supabase
        .from('company_ramos')
        .select('*', { count: 'exact', head: true })
        .eq('ramo_id', id)
        .eq('user_id', user.id);

      if (companiesError) throw new Error('Erro ao verificar seguradoras associadas: ' + companiesError.message);
      if (companiesCount && companiesCount > 0) {
        throw new Error(`Este ramo não pode ser excluído pois está associado a ${companiesCount} seguradoras.`);
      }

      // 3. Se passou, pode deletar
      const { error } = await supabase
        .from('ramos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw new Error('Erro ao excluir ramo: ' + error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramos'] });
      toast.success('Ramo excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

// Hook para buscar ramos de uma seguradora específica
export function useRamosByCompany(companyId: string | null) {
  return useQuery({
    queryKey: ['ramos-by-company', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase.rpc('get_ramos_by_company' as any, {
        company_id_param: companyId
      });
      
      if (error) throw error;
      return data as Ramo[];
    },
    enabled: !!companyId,
  });
}