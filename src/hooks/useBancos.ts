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
  currentBalance: number;
  color?: string;
  icon?: string;
}

export interface UpdateBankAccountPayload {
  id: string;
  bankName?: string;
  accountNumber?: string;
  agency?: string;
  accountType?: BankAccountType;
  currentBalance?: number;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

// ============ HOOKS ============

/**
 * Hook para buscar resumo de todas as contas bancárias
 */
export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts-summary'],
    queryFn: async (): Promise<BankAccountsSummary> => {
      const { data, error } = await supabase.rpc('get_bank_accounts_summary');
      
      if (error) throw error;
      
      return data as BankAccountsSummary;
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
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          bank_name: payload.bankName,
          account_number: payload.accountNumber,
          agency: payload.agency,
          account_type: payload.accountType,
          current_balance: payload.currentBalance,
          color: payload.color,
          icon: payload.icon,
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
      const { id, ...updates } = payload;
      
      const updateData: any = {};
      if (updates.bankName !== undefined) updateData.bank_name = updates.bankName;
      if (updates.accountNumber !== undefined) updateData.account_number = updates.accountNumber;
      if (updates.agency !== undefined) updateData.agency = updates.agency;
      if (updates.accountType !== undefined) updateData.account_type = updates.accountType;
      if (updates.currentBalance !== undefined) updateData.current_balance = updates.currentBalance;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(updateData)
        .eq('id', id)
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
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
    },
  });
}
