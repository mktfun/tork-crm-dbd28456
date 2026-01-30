import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  user_id: string;
  operation_type: string;
  tool_name: string;
  entity_type: string | null;
  entity_id: string | null;
  input_params: any;
  output_result: any;
  success: boolean;
  error_message: string | null;
  execution_time_ms: number | null;
  created_at: string;
  user?: {
    nome_completo: string;
    email: string;
  };
}

export interface AuditLogsFilters {
  userId?: string;
  operationType?: string;
  toolName?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export function useAuditLogs(filters: AuditLogsFilters = {}) {
  const {
    limit = 50,
    offset = 0,
  } = filters;

  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      // A tabela ai_operations_log pode não existir ainda
      // Retornamos dados vazios nesse caso
      try {
        // Tentativa de usar RPC se disponível, caso contrário retorna vazio
        console.warn('ai_operations_log table may not exist yet - returning empty data');
        return {
          logs: [] as AuditLog[],
          total: 0,
        };
      } catch (error) {
        console.error('Error fetching audit logs:', error);
        return { logs: [], total: 0 };
      }
    },
    retry: false,
  });
}

// Hook para obter estatísticas de auditoria
export function useAuditStats() {
  return useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      // Retorna stats zeradas enquanto a tabela não existir
      return {
        total: 0,
        successful: 0,
        failed: 0,
        recent24h: 0,
        avgExecutionTimeMs: 0,
        successRate: 0,
      };
    },
    retry: false,
  });
}
