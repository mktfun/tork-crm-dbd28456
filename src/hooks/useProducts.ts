import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CRMProduct {
  id: string;
  user_id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProducts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['crm-products', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('crm_products')
        .select('*')
        .eq('user_id', user!.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as CRMProduct[];
    },
    enabled: !!user
  });

  const activeProducts = (productsQuery.data || []).filter(p => p.is_active);

  const createProduct = useMutation({
    mutationFn: async (product: { name: string; description?: string; color?: string; icon?: string }) => {
      const { data, error } = await (supabase as any)
        .from('crm_products')
        .insert({
          user_id: user!.id,
          name: product.name,
          description: product.description || null,
          color: product.color || null,
          icon: product.icon || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-products'] });
      toast.success('Produto criado!');
    },
    onError: () => toast.error('Erro ao criar produto')
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMProduct> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('crm_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-products'] });
      toast.success('Produto atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar produto')
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      // Check if product has deals
      const { count } = await (supabase as any)
        .from('crm_deals')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (count && count > 0) {
        // Soft delete
        const { error } = await (supabase as any)
          .from('crm_products')
          .update({ is_active: false })
          .eq('id', productId);
        if (error) throw error;
        toast.info('Produto desativado (possui negócios vinculados)');
      } else {
        // Hard delete
        const { error } = await (supabase as any)
          .from('crm_products')
          .delete()
          .eq('id', productId);
        if (error) throw error;
        toast.success('Produto excluído!');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-products'] });
    },
    onError: () => toast.error('Erro ao excluir produto')
  });

  return {
    products: productsQuery.data || [],
    activeProducts,
    isLoading: productsQuery.isLoading,
    createProduct,
    updateProduct,
    deleteProduct
  };
}
