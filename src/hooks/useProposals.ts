import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Proposal, ProposalEvent, ProposalOption } from '@/types';

// ============================================================================
// 1. QUERY: Buscar Proposta vinculada a um Deal
// ============================================================================
export function useProposalByDeal(dealId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['proposal-by-deal', dealId],
    queryFn: async () => {
      if (!dealId || !user) return null;

      const { data, error } = await supabase
        .from('crm_proposals')
        .select(`
          *,
          options:crm_proposal_options(*)
        `)
        .eq('deal_id', dealId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Sort options client-side or we could order in the query, but postgrest inner order is tricky without explicitly defining it
      if (data && data.options) {
        data.options.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      }

      return data as Proposal | null;
    },
    enabled: !!dealId && !!user,
  });
}

// ============================================================================
// 2. MUTATION: Criar Proposta
// ============================================================================
export function useCreateProposal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { deal_id: string; title: string; client_name?: string; client_phone?: string; client_vehicle?: string; ramo?: string; token: string; options: Partial<ProposalOption>[] }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Insert proposal
      const { data: proposal, error: proposalError } = await supabase
        .from('crm_proposals')
        .insert({
          user_id: user.id,
          deal_id: payload.deal_id,
          title: payload.title,
          token: payload.token,
          client_name: payload.client_name,
          client_phone: payload.client_phone,
          client_vehicle: payload.client_vehicle,
          ramo: payload.ramo || 'auto',
          status: 'draft'
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // 2. Insert options
      if (payload.options && payload.options.length > 0) {
        const optionsToInsert = payload.options.map((opt, index) => ({
          ...opt,
          proposal_id: proposal.id,
          sort_order: index
        }));

        const { error: optionsError } = await supabase
          .from('crm_proposal_options')
          .insert(optionsToInsert);

        if (optionsError) throw optionsError;
      }

      return proposal;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-by-deal', variables.deal_id] });
      toast.success('Proposta gerada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar proposta:', error);
      toast.error('Erro ao criar proposta: ' + error.message);
    }
  });
}

// ============================================================================
// 3. MUTATION: Atualizar Proposta
// ============================================================================
export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Proposal> }) => {
      const { data, error } = await supabase
        .from('crm_proposals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-by-deal', data.deal_id] });
      toast.success('Proposta atualizada!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar proposta:', error);
      toast.error('Erro ao atualizar proposta.');
    }
  });
}

// ============================================================================
// 4. QUERY + REALTIME: Eventos da Proposta
// ============================================================================
export function useProposalEvents(proposalId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['proposal-events', proposalId],
    queryFn: async () => {
      if (!proposalId || !user) return [];

      const { data, error } = await supabase
        .from('crm_proposal_events')
        .select('*')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ProposalEvent[];
    },
    enabled: !!proposalId && !!user,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!proposalId || !user) return;

    const channel = supabase
      .channel(`proposal-events-${proposalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_proposal_events',
          filter: `proposal_id=eq.${proposalId}`
        },
        () => {
          // Re-fetch events when a new one is inserted
          queryClient.invalidateQueries({ queryKey: ['proposal-events', proposalId] });
          // Also invalidate the proposal itself to update views/time counts
          queryClient.invalidateQueries({ queryKey: ['proposal-by-deal'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId, user, queryClient]);

  return query;
}

// ============================================================================
// 5. QUERY (PUBLIC): Buscar Proposta por Token (Sem Auth)
// ============================================================================
export function usePublicProposal(token: string | null) {
  return useQuery({
    queryKey: ['public-proposal', token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase.rpc('get_proposal_by_token', {
        p_token: token
      });

      if (error) throw error;
      return data as { proposal: Proposal; options: ProposalOption[] } | null;
    },
    enabled: !!token,
  });
}

// ============================================================================
// 6. MUTATION (PUBLIC): Aceitar Proposta
// ============================================================================
export function useAcceptProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ token, optionId }: { token: string; optionId: string }) => {
      const { error } = await supabase.rpc('accept_proposal', {
        p_token: token,
        p_option_id: optionId
      });

      if (error) throw error;
      return true;
    },
    onSuccess: (_, variables) => {
      // Invalidate public query
      queryClient.invalidateQueries({ queryKey: ['public-proposal', variables.token] });
    },
    onError: (error: any) => {
      console.error('Erro ao aceitar proposta:', error);
      toast.error('Ocorreu um erro ao processar seu aceite. Tente novamente.');
    }
  });
}
