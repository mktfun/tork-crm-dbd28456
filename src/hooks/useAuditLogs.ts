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
    userId,
    operationType,
    toolName,
    success,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = filters;

  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('ai_operations_log')
        .select(`
          *,
          user:profiles(nome_completo, email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (operationType) {
        query = query.eq('operation_type', operationType);
      }

      if (toolName) {
        query = query.eq('tool_name', toolName);
      }

      if (success !== undefined) {
        query = query.eq('success', success);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        // Se a tabela não existir, retorna vazio
        if (error.code === '42P01') {
          return { logs: [], total: 0 };
        }
        throw error;
      }

      return {
        logs: data as AuditLog[],
        total: count || 0,
      };
    },
  });
}

// Hook para obter estatísticas de auditoria
export function useAuditStats() {
  return useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      try {
        // Total de operações
        const { count: totalOps, error: totalError } = await supabase
          .from('ai_operations_log')
          .select('*', { count: 'exact', head: true });
        
        // Se a tabela não existir, retorna stats zeradas
        if (totalError && totalError.code === '42P01') {
          return {
            total: 0,
            successful: 0,
            failed: 0,
            recent24h: 0,
            avgExecutionTimeMs: 0,
            successRate: 0,
          };
        }

      // Operações bem-sucedidas
      const { count: successOps } = await supabase
        .from('ai_operations_log')
        .select('*', { count: 'exact', head: true })
        .eq('success', true);

      // Operações com erro
      const { count: errorOps } = await supabase
        .from('ai_operations_log')
        .select('*', { count: 'exact', head: true })
        .eq('success', false);

      // Operações nas últimas 24h
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { count: recentOps } = await supabase
        .from('ai_operations_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      // Tempo médio de execução
      const { data: avgTime } = await supabase
        .from('ai_operations_log')
        .select('execution_time_ms')
        .not('execution_time_ms', 'is', null);

      const avgExecutionTime = avgTime && avgTime.length > 0
        ? avgTime.reduce((sum, log) => sum + (log.execution_time_ms || 0), 0) / avgTime.length
        : 0;

        return {
          total: totalOps || 0,
          successful: successOps || 0,
          failed: errorOps || 0,
          recent24h: recentOps || 0,
          avgExecutionTimeMs: Math.round(avgExecutionTime),
          successRate: totalOps ? ((successOps || 0) / totalOps) * 100 : 0,
        };
      } catch (error) {
        console.error('Error fetching audit stats:', error);
        return {
          total: 0,
          successful: 0,
          failed: 0,
          recent24h: 0,
          avgExecutionTimeMs: 0,
          successRate: 0,
        };
      }
    },
  });
}
