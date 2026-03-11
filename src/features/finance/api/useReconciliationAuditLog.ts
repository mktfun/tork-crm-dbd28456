import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReconciliationAuditEntry {
  id: string;
  action_type: string;
  operator_name: string;
  amount: number;
  bank_account_id: string | null;
  statement_entry_id: string | null;
  system_transaction_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

/**
 * Fetch audit log entries for statement entries belonging to a specific import batch.
 */
export function useAuditLogByBatch(batchId: string | null) {
  return useQuery({
    queryKey: ['reconciliation-audit-log', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      if (!batchId) return [];

      // First get all statement_entry IDs for this batch
      const { data: entries, error: entriesError } = await supabase
        .from('bank_statement_entries')
        .select('id')
        .eq('import_batch_id', batchId);

      if (entriesError) throw entriesError;
      if (!entries || entries.length === 0) return [];

      const entryIds = entries.map(e => e.id);

      // Then fetch audit logs for these entries
      const { data: logs, error: logsError } = await (supabase
        .from('reconciliation_audit_log' as any)
        .select('*')
        .in('statement_entry_id', entryIds)
        .order('created_at', { ascending: false }) as any);

      if (logsError) throw logsError;
      return (logs || []) as ReconciliationAuditEntry[];
    },
  });
}
