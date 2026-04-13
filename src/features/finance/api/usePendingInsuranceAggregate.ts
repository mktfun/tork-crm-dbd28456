import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface InsuranceAggregateItem {
  insurance_company_id: string;
  company_name: string;
  total_amount_pending: number;
  transaction_count: number;
  oldest_due_date: string | null;
}

export function usePendingInsuranceAggregate() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-insurance-aggregate', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await (supabase.rpc as any)(
        'get_pending_revenue_by_insurance',
        { p_user_id: user.id }
      );

      if (error) {
        console.error('Erro ao buscar agregado por seguradora:', error);
        throw error;
      }

      return (data || []) as InsuranceAggregateItem[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}
