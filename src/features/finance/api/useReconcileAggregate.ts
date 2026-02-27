import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReconcileAggregateParams {
  statementEntryId: string;
  insuranceCompanyId: string;
}

export function useReconcileAggregate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ statementEntryId, insuranceCompanyId }: ReconcileAggregateParams) => {
      const { data, error } = await (supabase.rpc as any)(
        'reconcile_insurance_aggregate_fifo',
        {
          p_statement_entry_id: statementEntryId,
          p_insurance_company_id: insuranceCompanyId,
        }
      );

      if (error) throw error;

      return data;
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
      queryClient.invalidateQueries({ queryKey: ['pending-insurance-aggregate'] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement-detailed'] });
      queryClient.invalidateQueries({ queryKey: ['bank-statement-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financial-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });

      toast.success('Conciliação FIFO realizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro na conciliação FIFO: ${error.message}`);
    },
  });
}
