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

// ============ HOOKS PARA BAIXA EM LOTE ============

/**
 * Hook para baixa em lote de receitas
 */
export function useBulkConfirmReceipts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: financialService.bulkConfirmReceipts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenue-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
    }
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
export function usePendingTotals(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['pending-totals', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_totals', {
        p_start_date: startDate || undefined,
        p_end_date: endDate || undefined
      });

      if (error) {
        console.error('Error fetching pending totals:', error);
        throw error;
      }

      // RPC retorna array com 1 linha [{ total_receivables, total_payables }]
      // ou vazio
      const row = (data as any[])?.[0] || { total_receivables: 0, total_payables: 0 };

      return {
        receivable: Number(row.total_receivables || 0),
        payable: Number(row.total_payables || 0)
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
      const rawData = data as Array<{ dimension_value: string; total_revenue: number; transaction_count: number }> || [];
      const totalRevenue = rawData.reduce((sum, item) => sum + Number(item.total_revenue), 0);

      return rawData.map(item => ({
        dimensionName: item.dimension_value,
        totalAmount: Number(item.total_revenue),
        transactionCount: Number(item.transaction_count),
        percentage: totalRevenue > 0 ? (Number(item.total_revenue) / totalRevenue) * 100 : 0
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
export function useAgingReport(referenceDate?: string) {
  return useQuery({
    queryKey: ['aging-report', referenceDate],
    queryFn: async (): Promise<AgingBucket[]> => {
      const { data, error } = await supabase.rpc('get_aging_report', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id
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
 * TODO: Conectar à RPC get_upcoming_receivables quando for criada
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
 * Hook para buscar transações a pagar e receber com filtros
 * TODO: Conectar à RPC get_payable_receivable_transactions quando for criada
 */
export function usePayableReceivableTransactions(
  transactionType: 'all' | 'receber' | 'pagar' = 'all',
  status: 'all' | 'atrasado' | 'pendente' | 'pago' = 'all'
) {
  return useQuery({
    queryKey: ['payable-receivable-transactions', transactionType, status],
    queryFn: async (): Promise<PayableReceivableTransaction[]> => {
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 300));

      const today = new Date();

      // Dados mock base
      const mockTransactions: PayableReceivableTransaction[] = [
        {
          transactionId: '1',
          transactionType: 'receber',
          entityName: 'Porto Seguro',
          description: 'Comissão Apólice Auto',
          amount: 1500.00,
          dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'atrasado',
          daysOverdue: 5,
        },
        {
          transactionId: '2',
          transactionType: 'pagar',
          entityName: 'Aluguel Escritório',
          description: 'Aluguel Mensal',
          amount: 2500.00,
          dueDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pendente',
          daysOverdue: 0,
        },
        {
          transactionId: '3',
          transactionType: 'receber',
          entityName: 'Bradesco',
          description: 'Comissão Vida',
          amount: 800.00,
          dueDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pago',
          daysOverdue: 0,
        },
      ];

      // Aplicar filtros
      let filtered = mockTransactions;

      if (transactionType !== 'all') {
        filtered = filtered.filter(t => t.transactionType === transactionType);
      }

      if (status !== 'all') {
        filtered = filtered.filter(t => t.status === status);
      }

      return filtered;
    },
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

      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
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
      // Mock data - tabela financial_goals não existe ainda
      const goals: FinancialGoal[] = [];
      for (let y = startYear; y <= endYear; y++) {
        const mStart = y === startYear ? startMonth : 1;
        const mEnd = y === endYear ? endMonth : 12;
        for (let m = mStart; m <= mEnd; m++) {
          goals.push({
            goalId: `mock-goal-${y}-${m}`,
            goalAmount: 50000 + Math.random() * 10000,
            year: y,
            month: m,
            description: `Meta ${m}/${y}`,
            createdAt: new Date().toISOString()
          });
        }
      }
      return goals;
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
      const startDate = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

      // 1. Buscar Meta
      const { data: goalData, error: goalError } = await supabase
        .from('financial_goals')
        .select('goal_amount')
        .eq('month', month)
        .eq('year', year)
        .eq('goal_type', goalType)
        .maybeSingle();

      if (goalError) {
        console.error('Error fetching goal:', goalError);
        throw goalError;
      }

      if (!goalData) return null; // Sem meta definida

      // 2. Buscar Realizado (Receita Total)
      // Usando a tabela financial_summary cacheada ou somando transações
      // Vamos simplificar e somar transactions 'completed' de revenue
      const { data: transactions, error: txError } = await supabase
        .from('financial_transactions')
        .select(`
          id,
          amount,
          financial_ledger!inner (
            account_id,
            amount
          )
        `)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .eq('status', 'completed')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate);

      // Nota: A query acima é complexa pq revenue é negativo no ledger, mas positivo na transaction (depende da implementação).
      // No seed: "Revenue entries were made negative, and pending ...".
      // Melhor usar a RPC get_revenue_by_dimension para pegar o total, agrupando tudo.
      // Ou melhor, RPC get_financial_summary se existisse.
      // Vou usar get_revenue_by_dimension e somar tudo.

      const { data: revenueData, error: rpcError } = await supabase.rpc('get_revenue_by_dimension', {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_start_date: startDate,
        p_end_date: endDate,
        p_dimension: 'type' // Qualquer dimensão serve, vamos somar o total
      });

      if (rpcError) throw rpcError;

      const actualAmount = (revenueData as any[]).reduce((sum, item) => sum + Number(item.total_revenue), 0);
      const goalAmount = Number(goalData.goal_amount);
      const percentageAchieved = goalAmount > 0 ? (actualAmount / goalAmount) * 100 : 0;

      return {
        goalAmount,
        actualAmount,
        difference: actualAmount - goalAmount,
        percentageAchieved,
        status: percentageAchieved >= 100 ? 'achieved' : percentageAchieved >= 80 ? 'near' : 'below'
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
      // Mock - tabela financial_goals não existe ainda
      console.log('Mock: Salvando meta', params);
      return {
        id: `mock-goal-${params.year}-${params.month}`,
        user_id: 'mock-user',
        year: params.year,
        month: params.month,
        goal_amount: params.goalAmount,
        goal_type: params.goalType || 'revenue',
        description: params.description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
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
 * Mock já que a tabela financial_goals não existe ainda
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      // Mock - tabela financial_goals não existe ainda
      console.log('Mock: Deletando meta', goalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-month-goal'] });
      queryClient.invalidateQueries({ queryKey: ['goals-by-period'] });
      queryClient.invalidateQueries({ queryKey: ['goal-vs-actual'] });
    }
  });
}
