/**
 * Sistema de Auditoria de Operações da IA
 * 
 * Registra todas as operações executadas pelo assistente de IA
 * para rastreabilidade, compliance e possibilidade de rollback.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { logger } from './logger.ts';

export interface AuditLogData {
  user_id: string;
  conversation_id?: string;
  operation_type: 'read' | 'create' | 'update' | 'delete' | 'tool_execution';
  entity_type?: string;
  entity_id?: string;
  tool_name?: string;
  before_state?: any;
  after_state?: any;
  success: boolean;
  error_message?: string;
  execution_time_ms?: number;
  metadata?: Record<string, any>;
}

/**
 * Registra uma operação no log de auditoria
 */
export async function auditLog(
  supabase: SupabaseClient,
  logData: AuditLogData
): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_operations_log')
      .insert({
        user_id: logData.user_id,
        conversation_id: logData.conversation_id,
        operation_type: logData.operation_type,
        entity_type: logData.entity_type,
        entity_id: logData.entity_id,
        tool_name: logData.tool_name,
        before_state: logData.before_state,
        after_state: logData.after_state,
        success: logData.success,
        error_message: logData.error_message,
        execution_time_ms: logData.execution_time_ms,
        metadata: logData.metadata || {},
      });

    if (error) {
      logger.error('Failed to write audit log', {
        error: error.message,
        logData,
      });
    }
  } catch (error) {
    // Não falhar a operação principal se o log de auditoria falhar
    logger.error('Exception while writing audit log', {
      error: error instanceof Error ? error.message : String(error),
      logData,
    });
  }
}

/**
 * Helper para criar um timer e registrar automaticamente o tempo de execução
 */
export function createAuditTimer(
  supabase: SupabaseClient,
  baseLogData: Omit<AuditLogData, 'success' | 'execution_time_ms'>
): {
  success: (afterState?: any) => Promise<void>;
  failure: (error: Error | string) => Promise<void>;
} {
  const startTime = Date.now();

  return {
    success: async (afterState?: any) => {
      const execution_time_ms = Date.now() - startTime;
      await auditLog(supabase, {
        ...baseLogData,
        after_state: afterState,
        success: true,
        execution_time_ms,
      });
    },
    failure: async (error: Error | string) => {
      const execution_time_ms = Date.now() - startTime;
      const error_message = error instanceof Error ? error.message : error;
      await auditLog(supabase, {
        ...baseLogData,
        success: false,
        error_message,
        execution_time_ms,
      });
    },
  };
}

/**
 * Busca logs de auditoria para análise
 */
export async function getAuditLogs(
  supabase: SupabaseClient,
  filters: {
    user_id?: string;
    conversation_id?: string;
    operation_type?: string;
    entity_type?: string;
    entity_id?: string;
    success?: boolean;
    limit?: number;
  }
): Promise<any[]> {
  let query = supabase
    .from('ai_operations_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.user_id) query = query.eq('user_id', filters.user_id);
  if (filters.conversation_id) query = query.eq('conversation_id', filters.conversation_id);
  if (filters.operation_type) query = query.eq('operation_type', filters.operation_type);
  if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
  if (filters.entity_id) query = query.eq('entity_id', filters.entity_id);
  if (filters.success !== undefined) query = query.eq('success', filters.success);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;

  if (error) {
    logger.error('Failed to fetch audit logs', { error: error.message, filters });
    return [];
  }

  return data || [];
}
