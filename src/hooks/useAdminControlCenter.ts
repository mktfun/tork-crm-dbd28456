import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

// --- Types ---

export interface AdminBrokerage {
  id: number;
  name: string;
  cnpj: string | null;
  plan_type: string;
  subscription_valid_until: string | null;
  has_crm_access: boolean;
  has_portal_access: boolean;
  has_ai_access: boolean;
  has_config_access: boolean;
}

export interface PaymentRecord {
  id: string;
  brokerage_id: number;
  amount: number;
  period_added: string;
  payment_date: string;
  status: string;
  recorded_by: string;
  created_at: string;
  recorder_name: string | null;
}

type ModuleColumn = 'has_crm_access' | 'has_portal_access' | 'has_ai_access' | 'has_config_access';

const MODULE_COLUMN_MAP: Record<string, ModuleColumn> = {
  crm: 'has_crm_access',
  portal: 'has_portal_access',
  ia: 'has_ai_access',
  config: 'has_config_access',
};

// --- Queries ---

export function useAdminBrokerages() {
  return useQuery({
    queryKey: ['admin-brokerages'],
    queryFn: async (): Promise<AdminBrokerage[]> => {
      const { data, error } = await supabase
        .from('brokerages')
        .select('id, name, cnpj, plan_type, subscription_valid_until, has_crm_access, has_portal_access, has_ai_access, has_config_access')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as AdminBrokerage[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useBrokeragePayments(brokerageId: number | null) {
  return useQuery({
    queryKey: ['brokerage-payments', brokerageId],
    queryFn: async (): Promise<PaymentRecord[]> => {
      if (!brokerageId) return [];

      const { data, error } = await supabase
        .from('organization_payments')
        .select('id, brokerage_id, amount, period_added, payment_date, status, recorded_by, created_at')
        .eq('brokerage_id', brokerageId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      // Fetch recorder names
      const recorderIds = [...new Set((data ?? []).map((p) => p.recorded_by))];
      let profileMap: Record<string, string> = {};

      if (recorderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome_completo')
          .in('id', recorderIds);

        if (profiles) {
          profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.nome_completo]));
        }
      }

      return (data ?? []).map((p) => ({
        ...p,
        amount: Number(p.amount),
        recorder_name: profileMap[p.recorded_by] ?? 'Admin',
      }));
    },
    enabled: !!brokerageId,
    staleTime: 1000 * 60,
  });
}

// --- Mutations ---

export function useToggleModuleAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ brokerageId, moduleKey, value }: { brokerageId: number; moduleKey: string; value: boolean }) => {
      const column = MODULE_COLUMN_MAP[moduleKey];
      if (!column) throw new Error(`Módulo inválido: ${moduleKey}`);

      const { error } = await supabase
        .from('brokerages')
        .update({ [column]: value })
        .eq('id', brokerageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brokerages'] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao alterar módulo: ' + error.message);
    },
  });
}

export function useUpdateBrokeragePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ brokerageId, planType }: { brokerageId: number; planType: string }) => {
      const { error } = await supabase
        .from('brokerages')
        .update({ plan_type: planType })
        .eq('id', brokerageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brokerages'] });
      toast.success('Plano atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar plano: ' + error.message);
    },
  });
}

export function useRegisterPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      brokerageId,
      amount,
      periodAdded,
      paymentDate,
      currentValidUntil,
    }: {
      brokerageId: number;
      amount: number;
      periodAdded: string;
      paymentDate: string;
      currentValidUntil: string | null;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Insert payment record
      const { error: paymentError } = await supabase
        .from('organization_payments')
        .insert({
          brokerage_id: brokerageId,
          amount,
          period_added: periodAdded,
          payment_date: paymentDate,
          recorded_by: user.id,
        });

      if (paymentError) throw paymentError;

      // Calculate new expiration date
      const baseDate = currentValidUntil && new Date(currentValidUntil) > new Date()
        ? new Date(currentValidUntil)
        : new Date();

      let newDate = new Date(baseDate);
      switch (periodAdded) {
        case '1 Mês':
          newDate.setMonth(newDate.getMonth() + 1);
          break;
        case '6 Meses':
          newDate.setMonth(newDate.getMonth() + 6);
          break;
        case '1 Ano':
          newDate.setFullYear(newDate.getFullYear() + 1);
          break;
      }

      const { error: updateError } = await supabase
        .from('brokerages')
        .update({ subscription_valid_until: newDate.toISOString() })
        .eq('id', brokerageId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brokerages'] });
      queryClient.invalidateQueries({ queryKey: ['brokerage-payments'] });
      toast.success('Pagamento registrado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao registrar pagamento: ' + error.message);
    },
  });
}
