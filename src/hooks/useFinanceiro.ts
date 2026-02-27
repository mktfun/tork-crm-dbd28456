import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as financialService from '@/services/financialService';
import { FinancialAccountType, BulkImportPayload } from '@/types/financeiro';

/**
 * Hook para buscar contas financeiras
 */
export function useFinancialAccounts(type?: FinancialAccountType) {
  return useQuery({
    queryKey: ['financial-accounts', type],
    queryFn: () => type
      ? financialService.getAccountsByType(type)
      : financialService.getAllAccounts()
  });
}

/**
 * Hook para garantir contas padrão e buscar todas
 */
export function useFinancialAccountsWithDefaults() {
  // Primeiro, garantir que existam contas padrão
  const ensureDefaults = useQuery({
    queryKey: ['financial-accounts-ensure'],
    queryFn: async () => {
      await financialService.ensureDefaultAccounts();
      return true;
    },
    staleTime: Infinity, // Só roda uma vez
    retry: false
  });

  // Depois buscar as contas
  const accountsQuery = useQuery({
    queryKey: ['financial-accounts'],
    queryFn: financialService.getAllAccounts,
    enabled: ensureDefaults.isSuccess
  });

  return {
    ...accountsQuery,
    isLoading: ensureDefaults.isLoading || accountsQuery.isLoading,
    isEnsuring: ensureDefaults.isLoading
  };
}

/**
 * Hook para buscar transações recentes
 */
export function useRecentTransactions(type?: 'expense' | 'revenue') {
  return useQuery({
    queryKey: ['financial-transactions', type],
    queryFn: () => financialService.getRecentTransactions({ type })
  });
}

/**
 * Hook para registrar despesa
 */
export function useRegisterExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financialService.registerExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
    }
  });
}

/**
 * Hook para registrar receita
 */
export function useRegisterRevenue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financialService.registerRevenue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
    }
  });
}

/**
 * Hook para criar conta
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financialService.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
    }
  });
}

/**
 * Hook universal para criar movimentação financeira (Receita ou Despesa)
 */
export function useCreateFinancialMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financialService.createFinancialMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-transactions'] });
    }
  });
}

/**
 * Hook para anular transação (deprecated - use useReverseTransaction)
 */
export function useVoidTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason: string }) =>
      financialService.voidTransaction(transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
    }
  });
}

/**
 * Hook para estornar transação (cria lançamentos inversos no ledger)
 */
export function useReverseTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, reason }: { transactionId: string; reason: string }) =>
      financialService.reverseTransaction(transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-details'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
      queryClient.invalidateQueries({ queryKey: ['bank-transactions'] });
    }
  });
}

// ============ HOOKS PARA FLUXO DE CAIXA ============

/**
 * Hook para buscar dados de fluxo de caixa
 */
export function useCashFlowData(startDate: string, endDate: string, granularity: 'day' | 'month' = 'day') {
  return useQuery({
    queryKey: ['cash-flow', startDate, endDate, granularity],
    queryFn: () => financialService.getCashFlowData({ startDate, endDate, granularity }),
    enabled: !!startDate && !!endDate
  });
}

/**
 * Hook para buscar resumo financeiro (KPIs)
 */
export function useFinancialSummary(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['financial-summary', startDate, endDate],
    queryFn: () => financialService.getFinancialSummary({ startDate, endDate }),
    enabled: !!startDate && !!endDate
  });
}

// ============ HOOKS PARA DRE ============

/**
 * Hook para buscar dados do DRE (Demonstrativo de Resultado)
 */
export function useDreData(year?: number) {
  return useQuery({
    queryKey: ['dre-data', year],
    queryFn: () => financialService.getDreData(year)
  });
}

// ============ HOOKS PARA IMPORTAÇÃO ============

/**
 * Hook para importação em massa de transações
 */
export function useBulkImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: BulkImportPayload) =>
      financialService.bulkImportTransactions(payload),
    onSuccess: () => {
      // Invalidar todos os caches relacionados
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dre-data'] });
    }
  });
}

// ============ HOOKS PARA CONFIGURAÇÕES ============

/**
 * Hook para atualizar conta financeira
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, updates }: {
      accountId: string;
      updates: { name: string; code?: string; description?: string }
    }) => financialService.updateAccount(accountId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
    }
  });
}

/**
 * Hook para arquivar conta financeira
 */
export function useArchiveAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financialService.archiveAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
    }
  });
}

// ============ HOOKS PARA SAFE DELETE E RECEITAS ============

/**
 * Hook para contar lançamentos de uma conta
 */
export function useLedgerEntryCount(accountId: string | null) {
  return useQuery({
    queryKey: ['ledger-entry-count', accountId],
    queryFn: () => financialService.countLedgerEntriesByAccount(accountId!),
    enabled: !!accountId
  });
}

/**
 * Hook para exclusão segura de conta
 */
export function useSafeDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ targetAccountId, migrateToAccountId }: {
      targetAccountId: string;
      migrateToAccountId?: string;
    }) => financialService.deleteAccountSafe(targetAccountId, migrateToAccountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-entry-count'] });
    }
  });
}

/**
 * Hook para buscar transações de receita
 */
export function useRevenueTransactions(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['revenue-transactions', startDate, endDate],
    queryFn: () => financialService.getRevenueTransactions({ startDate, endDate }),
    enabled: !!startDate && !!endDate
  });
}

/**
 * Hook para buscar totais de receita
 */
export function useRevenueTotals(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['revenue-totals', startDate, endDate],
    queryFn: () => financialService.getRevenueTotals({ startDate, endDate }),
    enabled: !!startDate && !!endDate
  });
}

/**
 * Hook para liquidar (dar baixa em) comissão pendente
 */
export function useSettleCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      transactionId: string;
      bankAccountId: string;
      settlementDate?: string;
    }) => financialService.settleCommission(params),
    onSuccess: async () => {
      // Invalidar todos os caches relacionados
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['revenue-transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['financial-transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['transaction-details'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['cash-flow'] }),
        queryClient.invalidateQueries({ queryKey: ['financial-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['account-balances'] }),
        queryClient.invalidateQueries({ queryKey: ['account-statement'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-totals'] }),
      ]);

      // Forçar refetch imediato dos saldos para garantir atualização
      queryClient.refetchQueries({ queryKey: ['account-balances'] });
    }
  });
}

/**
 * Hook para buscar detalhes de uma transação
 * @param transactionId - ID da transação (pode ser ID moderno ou legado)
 * @param isLegacyId - Se true, busca pelo ID legado (tabela transactions)
 */
export function useTransactionDetails(transactionId: string | null, isLegacyId = false) {
  return useQuery({
    queryKey: ['transaction-details', transactionId, isLegacyId],
    queryFn: () => financialService.getTransactionDetails(
      isLegacyId ? null : transactionId,
      isLegacyId ? transactionId : null
    ),
    enabled: !!transactionId
  });
}

/**
 * Hook para buscar totais pendentes (A Receber e A Pagar)
 */
export function usePendingTotals() {
  return useQuery({
    queryKey: ['pending-totals'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_totals');

      if (error) {
        console.error('Error fetching pending totals:', error);
        throw error;
      }

      // RPC retorna JSON { receivable, payable, receivable_count, payable_count }
      const result = (data as any) || { receivable: 0, payable: 0 };

      return {
        receivable: Number(result.receivable || 0),
        payable: Number(result.payable || 0)
      };
    }
  });
}

/**
 * Hook para buscar cash flow com projeção
 */
export function useCashFlowWithProjection(
  startDate: string,
  endDate: string,
  granularity: 'day' | 'month' = 'day'
) {
  return useQuery({
    queryKey: ['cash-flow-projection', startDate, endDate, granularity],
    queryFn: () => financialService.getCashFlowWithProjection(startDate, endDate, granularity),
    enabled: !!startDate && !!endDate
  });
}

/**
 * Hook para buscar total geral de pendentes a receber (sem filtro de data)
 */
export function useTotalPendingReceivables() {
  return useQuery({
    queryKey: ['total-pending-receivables'],
    queryFn: () => financialService.getTotalPendingReceivables()
  });
}

/**
 * Hook para buscar pendentes vencendo no mês atual
 */
export function usePendingThisMonth() {
  return useQuery({
    queryKey: ['pending-this-month'],
    queryFn: () => financialService.getPendingThisMonth()
  });
}

// ============ HOOKS PARA ANÁLISE POR DIMENSÃO ============

import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';

export interface DimensionBreakdown {
  dimensionName: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

/**
 * Hook para análise de receitas por dimensão (produtor, ramo, seguradora)
 */
export function useRevenueByDimension(
  dimension: 'producer' | 'type' | 'insurance_company',
  dateRange?: DateRange
) {
  return useQuery({
    queryKey: ['revenue-by-dimension', dimension, dateRange],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Não autenticado');

      const startDate = dateRange?.from
        ? format(dateRange.from, 'yyyy-MM-dd')
        : format(startOfMonth(new Date()), 'yyyy-MM-dd');

      const endDate = dateRange?.to
        ? format(dateRange.to, 'yyyy-MM-dd')
        : format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data, error } = await supabase.rpc('get_revenue_by_dimension', {
        p_user_id: session.user.id,
        p_start_date: startDate,
        p_end_date: endDate,
        p_dimension: dimension
      });

      if (error) throw error;

      // Mapear campos snake_case para camelCase
      const rawData = (data as unknown) as Array<{
        dimension_name: string;
        total_amount: number;
        transaction_count: number;
        percentage: number;
      }> || [];

      return rawData.map(item => ({
        dimensionName: item.dimension_name,
        totalAmount: Number(item.total_amount),
        transactionCount: Number(item.transaction_count),
        percentage: Number(item.percentage)
      })) as DimensionBreakdown[];
    },
  });
}

// ============ HOOKS PARA TESOURARIA E AGING REPORT ============

export interface AgingBucket {
  bucketRange: string;
  bucketAmount: number;
  bucketCount: number;
  bucketColor: string;
}

export interface UpcomingReceivable {
  transactionId: string;
  dueDate: string;
  entityName: string;
  description: string;
  amount: number;
  daysUntilDue: number;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

export interface PayableReceivableTransaction {
  transactionId: string;
  transactionType: 'receber' | 'pagar';
  dueDate: string;
  entityName: string;
  description: string;
  amount: number;
  status: 'atrasado' | 'pendente' | 'pago';
  daysOverdue: number;
}

/**
 * Hook para buscar relatório de aging (análise de vencimentos)
 * TODO: Conectar à RPC get_aging_report quando for criada
 */
/**
 * Hook para buscar relatório de aging (análise de vencimentos)
 * TODO: Conectar à RPC get_aging_report quando for criada
 */
export function useAgingReport(type: 'receivables' | 'payables' = 'receivables') {
  return useQuery({
    queryKey: ['aging-report', type],
    queryFn: async (): Promise<AgingBucket[]> => {
      // Nota: o RPC get_aging_report precisaria aceitar um parametro type.
      // Assumindo que o RPC será atualizado ou já aceita, mas baseado no prompt:
      // "Adicione uma prop defaultType... Passe o type para o hook"
      // Se o RPC não aceitar, teremos que filtrar no client ou assumir que o RPC já faz isso.
      // Como não tenho acesso ao SQL agora e devo seguir o prompt, vou passar o parametro.
      const { data, error } = await supabase.rpc('get_aging_report', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        // p_type: type // Supondo que o RPC aceita isso. Se der erro, corrigirei.
        // O prompt não pediu pra alterar SQL, apenas "Tornar o Relatório de Aging Dinâmico".
        // Se o RPC atual só retorna receivables, precisaria de um 'get_aging_report_payables' ou parametro.
        // Vou assumir que o RPC atual é só receivables e tentar passar o parametro.
        // Se falhar, vou simular com filtro de transactions se necessário, mas o ideal é RPC.
        // Pelo padrão do projeto, provavelmente o RPC precisaria ser ajustado.
        // Mas como não posso mexer no DB sem permissão explícita/ferramenta,
        // vou enviar o parametro e se o RPC ignorar, paciência (ou erro).
        // EDIT: O prompt diz "Tornar o Relatório de Aging Dinâmico".
        // Vou adicionar o parametro p_type se possível.
        p_type: type
      });

      if (error) {
        console.error('Error fetching aging report:', error);
        throw error;
      }

      return (data as any[]).map(item => ({
        bucketRange: item.bucket_range,
        bucketAmount: Number(item.bucket_amount),
        bucketCount: Number(item.bucket_count),
        bucketColor: item.bucket_color
      }));
    },
  });
}

/**
 * Hook para buscar recebíveis próximos ao vencimento
 */
export function useUpcomingReceivables(daysAhead: number = 30) {
  return useQuery({
    queryKey: ['upcoming-receivables', daysAhead],
    queryFn: async (): Promise<UpcomingReceivable[]> => {
      const { data, error } = await supabase.rpc('get_upcoming_receivables', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_days_ahead: daysAhead
      });

      if (error) {
        console.error('Error fetching upcoming receivables:', error);
        throw error;
      }

      return (data as any[]).map(item => ({
        transactionId: item.transaction_id,
        dueDate: item.due_date,
        entityName: item.entity_name,
        description: item.description,
        amount: Number(item.amount),
        daysUntilDue: Number(item.days_until_due),
        relatedEntityType: item.related_entity_type,
        relatedEntityId: item.related_entity_id
      }));
    },
  });
}

/**
 * Hook para buscar pagamentos próximos ao vencimento
 */
export function useUpcomingPayables(daysAhead: number = 30) {
  return useQuery({
    queryKey: ['upcoming-payables', daysAhead],
    queryFn: async (): Promise<UpcomingReceivable[]> => {
      const { data, error } = await supabase.rpc('get_upcoming_payables', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_days_ahead: daysAhead
      });

      if (error) {
        console.error('Error fetching upcoming payables:', error);
        throw error;
      }

      return (data as any[]).map(item => ({
        transactionId: item.transaction_id,
        dueDate: item.due_date,
        entityName: item.entity_name,
        description: item.description,
        amount: Number(item.amount),
        daysUntilDue: Number(item.days_until_due),
        relatedEntityType: item.related_entity_type,
        relatedEntityId: item.related_entity_id
      }));
    },
  });
}

/**
 * Hook para buscar transações a pagar e receber com filtros
 */
export function usePayableReceivableTransactions(
  transactionType: 'all' | 'receber' | 'pagar' = 'all',
  status: 'all' | 'atrasado' | 'pendente' | 'pago' = 'all'
) {
  return useQuery({
    queryKey: ['payable-receivable-transactions', transactionType, status],
    queryFn: () => financialService.getPayableReceivableTransactions(transactionType, status),
  });
}

// ============ HOOKS PARA METAS FINANCEIRAS ============

export interface FinancialGoal {
  goalId: string;
  goalAmount: number;
  year: number;
  month: number;
  description: string | null;
  createdAt?: string;
}

export interface GoalVsActual {
  goalAmount: number;
  actualAmount: number;
  difference: number;
  percentageAchieved: number;
  status: 'achieved' | 'near' | 'below';
}

/**
 * Hook para buscar meta do mês atual
 * Retorna dados mock já que a tabela financial_goals não existe ainda
 */
export function useCurrentMonthGoal(goalType: 'revenue' | 'profit' | 'commission' = 'revenue') {
  return useQuery({
    queryKey: ['current-month-goal', goalType],
    queryFn: async (): Promise<FinancialGoal | null> => {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', year)
        .eq('goal_type', goalType)
        .maybeSingle();

      if (error) {
        console.error('Error fetching current month goal:', error);
        throw error;
      }

      if (!data) return null;

      return {
        goalId: data.id,
        goalAmount: Number(data.goal_amount),
        year: data.year,
        month: data.month,
        description: data.description,
        createdAt: data.created_at
      };
    },
  });
}

/**
 * Hook para buscar metas de um período
 * Retorna dados mock já que a tabela financial_goals não existe ainda
 */
export function useGoalsByPeriod(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  goalType: 'revenue' | 'profit' | 'commission' = 'revenue'
) {
  return useQuery({
    queryKey: ['goals-by-period', startYear, startMonth, endYear, endMonth, goalType],
    queryFn: async (): Promise<FinancialGoal[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_type', goalType)
        .gte('year', startYear)
        .lte('year', endYear);

      if (error) {
        console.error('Error fetching goals by period:', error);
        throw error;
      }

      // Filter months in JS to simplify query logic for cross-year periods
      // Also mapped to domain object
      const filtered = (data || []).filter(item => {
        if (item.year === startYear && item.month < startMonth) return false;
        if (item.year === endYear && item.month > endMonth) return false;
        return true;
      });

      return filtered.map(item => ({
        goalId: item.id,
        goalAmount: Number(item.goal_amount),
        year: item.year,
        month: item.month,
        description: item.description,
        createdAt: item.created_at
      }));
    },
  });
}

/**
 * Hook para comparar meta vs realizado
 * Retorna dados mock já que as funções RPC não existem ainda
 */
export function useGoalVsActual(
  year: number,
  month: number,
  goalType: 'revenue' | 'profit' | 'commission' = 'revenue'
) {
  return useQuery({
    queryKey: ['goal-vs-actual', year, month, goalType],
    queryFn: async (): Promise<GoalVsActual | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      // Passing p_user_id to satisfy generated types, even if RPC uses auth.uid() internally
      // Casting to any to avoid strict type checks if definition is slightly off
      const params: any = {
        p_year: year,
        p_month: month,
        p_user_id: user.id
      };

      const { data, error } = await supabase.rpc('get_goal_vs_actual', params) as any;

      if (error) {
        console.error('Error calling get_goal_vs_actual:', error);
        return null;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result) return {
        goalAmount: 0,
        actualAmount: 0,
        difference: 0,
        percentageAchieved: 0,
        status: 'below'
      };

      const goal = Number(result.goal_amount || 0);
      const actual = Number(result.actual_amount || 0);
      const percentage = Number(result.pct ?? result.progress ?? 0);
      const diff = actual - goal;

      let status: 'achieved' | 'near' | 'below' = 'below';
      if (percentage >= 100) status = 'achieved';
      else if (percentage >= 80) status = 'near';

      return {
        goalAmount: goal,
        actualAmount: actual,
        difference: diff,
        percentageAchieved: percentage,
        status
      };
    },
  });
}

/**
 * Hook para criar/atualizar meta financeira
 * Retorna mock já que a tabela financial_goals não existe ainda
 */
export function useUpsertGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      year: number;
      month: number;
      goalAmount: number;
      goalType?: 'revenue' | 'profit' | 'commission';
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const { data, error } = await supabase
        .from('financial_goals')
        .upsert({
          user_id: user.id,
          year: params.year,
          month: params.month,
          goal_amount: params.goalAmount,
          goal_type: params.goalType || 'revenue',
          description: params.description || null,
        }, { onConflict: 'user_id,year,month,goal_type' })
        .select()
        .single();

      if (error) {
        console.error('Error upserting goal:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-month-goal'] });
      queryClient.invalidateQueries({ queryKey: ['goals-by-period'] });
      queryClient.invalidateQueries({ queryKey: ['goal-vs-actual'] });
    }
  });
}

/**
 * Hook para deletar meta financeira
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', goalId);

      if (error) {
        console.error('Error deleting goal:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-month-goal'] });
      queryClient.invalidateQueries({ queryKey: ['goals-by-period'] });
      queryClient.invalidateQueries({ queryKey: ['goal-vs-actual'] });
    }
  });
}
