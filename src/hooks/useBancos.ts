import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============ TIPOS ============

export type BankAccountType = 'corrente' | 'poupanca' | 'investimento' | 'giro';

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber?: string;
  agency?: string;
  accountType: BankAccountType;
  currentBalance: number;
  lastSyncDate?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountsSummary {
  accounts: BankAccount[];
  totalBalance: number;
  activeAccounts: number;
}

export interface CreateBankAccountPayload {
  bankName: string;
  accountNumber?: string;
  agency?: string;
  accountType: BankAccountType;
  initialBalance: number;
  color?: string;
  icon?: string;
}

export interface UpdateBankAccountPayload {
  id: string;
  bankName?: string;
  accountNumber?: string;
  agency?: string;
  accountType?: BankAccountType;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface UnbankedTransaction {
  transactionId: string;
  transactionDate: string;
  description: string;
  amount: number;
  transactionType: 'receita' | 'despesa' | 'outro';
  status: string;
}

export interface BankDistribution {
  bankAccountId: string;
  amount: number;
  percentage: number;
}

// ============ HOOKS ============

/**
 * Hook para buscar resumo de todas as contas bancárias
 */
// Interface para a resposta bruta do banco
interface BankAccountRow {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string | null;
  agency: string | null;
  account_type: string;
  current_balance: string;
  last_sync_date: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts-summary'],
    queryFn: async (): Promise<BankAccountsSummary> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar contas bancárias usando query tipada manualmente
      const { data: accounts, error } = await supabase
        .from('bank_accounts' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Mapear para formato do frontend
      const mappedAccounts: BankAccount[] = ((accounts || []) as unknown as BankAccountRow[]).map(acc => ({
        id: acc.id,
        bankName: acc.bank_name,
        accountNumber: acc.account_number || undefined,
        agency: acc.agency || undefined,
        accountType: acc.account_type as BankAccountType,
        currentBalance: parseFloat(acc.current_balance) || 0,
        lastSyncDate: acc.last_sync_date || undefined,
        color: acc.color || undefined,
        icon: acc.icon || undefined,
        isActive: acc.is_active,
        createdAt: acc.created_at,
        updatedAt: acc.updated_at,
      }));

      // Calcular saldo real de cada banco usando a função SQL
      const accountsWithRealBalance = await Promise.all(
        mappedAccounts.map(async (acc) => {
          try {
            const { data: balanceData, error: balanceError } = await supabase
              .rpc('get_bank_balance' as any, {
                p_bank_account_id: acc.id,
                p_include_pending: false
              });

            if (balanceError) {
              console.error('Erro ao calcular saldo:', balanceError);
              // Retornar o saldo inicial do banco se a função SQL falhar
              return {
                ...acc,
                currentBalance: acc.currentBalance || 0
              };
            }

            const parsedBalance = parseFloat(String(balanceData));
            return {
              ...acc,
              currentBalance: isNaN(parsedBalance) ? (acc.currentBalance || 0) : parsedBalance
            };
          } catch (e) {
            console.error('Erro inesperado ao calcular saldo:', e);
            return {
              ...acc,
              currentBalance: acc.currentBalance || 0
            };
          }
        })
      );

      const activeAccounts = accountsWithRealBalance.filter(a => a.isActive);
      const totalBalance = activeAccounts.reduce((sum, a) => sum + a.currentBalance, 0);

      return {
        accounts: accountsWithRealBalance,
        totalBalance,
        activeAccounts: activeAccounts.length,
      };
    },
  });
}

/**
 * Hook para criar nova conta bancária
 */
export function useCreateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateBankAccountPayload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('bank_accounts' as any)
        .insert({
          user_id: user.id,
          bank_name: payload.bankName,
          account_number: payload.accountNumber,
          agency: payload.agency,
          account_type: payload.accountType,
          current_balance: payload.initialBalance,
          color: payload.color,
          icon: payload.icon,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
    },
  });
}

/**
 * Hook para atualizar conta bancária
 */
export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateBankAccountPayload) => {
      const updateData: any = {};

      if (payload.bankName !== undefined) updateData.bank_name = payload.bankName;
      if (payload.accountNumber !== undefined) updateData.account_number = payload.accountNumber;
      if (payload.agency !== undefined) updateData.agency = payload.agency;
      if (payload.accountType !== undefined) updateData.account_type = payload.accountType;
      if (payload.color !== undefined) updateData.color = payload.color;
      if (payload.icon !== undefined) updateData.icon = payload.icon;
      if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

      const { data, error } = await supabase
        .from('bank_accounts' as any)
        .update(updateData)
        .eq('id', payload.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
    },
  });
}

/**
 * Hook para deletar conta bancária
 */
export function useDeleteBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('bank_accounts' as any)
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      return { deleted: true, accountId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
    },
  });
}

/**
 * Hook para buscar transações sem banco (legadas)
 */
export function useUnbankedTransactions(limit: number = 100) {
  return useQuery({
    queryKey: ['unbanked-transactions', limit],
    queryFn: async (): Promise<UnbankedTransaction[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .rpc('get_unbanked_transactions' as any, {
          p_user_id: user.id,
          p_limit: limit
        });

      if (error) throw error;

      return (data || []).map((tx: any) => ({
        transactionId: tx.transaction_id,
        transactionDate: tx.transaction_date,
        description: tx.description,
        amount: parseFloat(tx.amount || '0'),
        transactionType: tx.transaction_type,
        status: tx.status,
      }));
    },
  });
}

/**
 * Hook para atribuir banco a múltiplas transações
 */
export function useAssignBankToTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionIds, bankAccountId }: {
      transactionIds: string[],
      bankAccountId: string
    }) => {
      const { data, error } = await supabase
        .rpc('assign_bank_to_transactions' as any, {
          p_transaction_ids: transactionIds,
          p_bank_account_id: bankAccountId
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unbanked-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
    },
  });
}

/**
 * Hook para distribuir transação entre múltiplos bancos
 */
export function useDistributeTransactionToBanks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, distributions }: {
      transactionId: string,
      distributions: BankDistribution[]
    }) => {
      // Converter para formato JSONB esperado pela função
      const jsonbDistributions = distributions.map(d => ({
        bank_account_id: d.bankAccountId,
        amount: d.amount,
        percentage: d.percentage
      }));

      const { data, error } = await supabase
        .rpc('distribute_transaction_to_banks' as any, {
          p_transaction_id: transactionId,
          p_distributions: jsonbDistributions
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unbanked-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] });
    },
  });
}

// ============ TIPOS PARA HISTÓRICO BANCÁRIO ============

export interface BankTransaction {
  transactionId: string;
  transactionDate: string;
  description: string;
  amount: number;
  accountName: string;
  accountType: 'revenue' | 'expense' | 'income' | string;
  bankAccountId: string | null;
  bankName: string | null;
  bankColor: string | null;
  status: string;
  isVoid: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

export interface BankTransactionsResult {
  transactions: BankTransaction[];
  totalCount: number;
  totalIncome: number;
  totalExpense: number;
  pageCount: number;
}

/**
 * Hook para buscar transações de um banco específico (ou todos) com paginação
 * 
 * @param bankAccountId - ID do banco, ou null para buscar de todos os bancos
 * @param page - Página atual (1-indexed)
 * @param pageSize - Quantidade por página
 */
export function useBankTransactions(
  bankAccountId: string | null,
  page: number = 1,
  pageSize: number = 20
) {
  return useQuery({
    queryKey: ['bank-transactions', bankAccountId, page, pageSize],
    queryFn: async (): Promise<BankTransactionsResult> => {
      const { data, error } = await supabase
        .rpc('get_bank_transactions' as any, {
          p_bank_account_id: bankAccountId,
          p_page: page,
          p_page_size: pageSize
        });

      if (error) {
        console.error('Erro ao buscar transações do banco:', error);
        throw error;
      }

      // A função retorna um array com 1 row contendo os campos
      const result = data?.[0] || data;

      if (!result) {
        return {
          transactions: [],
          totalCount: 0,
          totalIncome: 0,
          totalExpense: 0,
          pageCount: 0,
        };
      }

      // Mapear transações do formato SQL para frontend
      const transactions: BankTransaction[] = (result.transactions || []).map((tx: any) => ({
        transactionId: tx.f1 || tx.transaction_id,
        transactionDate: tx.f2 || tx.transaction_date,
        description: tx.f3 || tx.description,
        amount: parseFloat(tx.f4 || tx.amount || '0'),
        accountName: tx.f5 || tx.account_name || '',
        accountType: tx.f6 || tx.account_type || '',
        bankAccountId: tx.f7 || tx.bank_account_id || null,
        bankName: tx.f8 || tx.bank_name || null,
        bankColor: tx.f9 || tx.bank_color || null,
        status: tx.f10 || tx.status || 'confirmed',
        isVoid: tx.f11 || tx.is_void || false,
        relatedEntityType: tx.f12 || tx.related_entity_type || null,
        relatedEntityId: tx.f13 || tx.related_entity_id || null,
      }));

      return {
        transactions,
        totalCount: result.total_count || 0,
        totalIncome: parseFloat(result.total_income || '0'),
        totalExpense: parseFloat(result.total_expense || '0'),
        pageCount: result.page_count || 0,
      };
    },
    enabled: true, // Sempre habilitado, bankAccountId null = todos os bancos
  });
}
