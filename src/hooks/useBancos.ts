import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

// ============ MOCK DATA ============

const mockBankAccounts: BankAccount[] = [
  {
    id: '1',
    bankName: 'Itaú',
    accountNumber: '12345-6',
    agency: '0001',
    accountType: 'corrente',
    currentBalance: 187432.50,
    lastSyncDate: new Date().toISOString(),
    color: '#FF6B00',
    icon: '🏦',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    bankName: 'Bradesco',
    accountNumber: '98765-4',
    agency: '1234',
    accountType: 'corrente',
    currentBalance: 54321.00,
    lastSyncDate: new Date().toISOString(),
    color: '#CC092F',
    icon: '🏧',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    bankName: 'Nubank',
    accountNumber: '11111-1',
    agency: '0001',
    accountType: 'corrente',
    currentBalance: 28750.25,
    lastSyncDate: new Date().toISOString(),
    color: '#8A05BE',
    icon: '💜',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ============ HOOKS ============

/**
 * Hook para buscar resumo de todas as contas bancárias
 * TODO: Conectar ao banco de dados quando tabela bank_accounts for criada
 */
export function useBankAccounts() {
  return useQuery({
    queryKey: ['bank-accounts-summary'],
    queryFn: async (): Promise<BankAccountsSummary> => {
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const activeAccounts = mockBankAccounts.filter(a => a.isActive);
      const totalBalance = activeAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
      
      return {
        accounts: mockBankAccounts,
        totalBalance,
        activeAccounts: activeAccounts.length,
      };
    },
  });
}

/**
 * Hook para criar nova conta bancária
 * TODO: Conectar ao banco de dados quando tabela bank_accounts for criada
 */
export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: CreateBankAccountPayload) => {
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newAccount: BankAccount = {
        id: Math.random().toString(36).substring(7),
        ...payload,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return newAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
    },
  });
}

/**
 * Hook para atualizar conta bancária
 * TODO: Conectar ao banco de dados quando tabela bank_accounts for criada
 */
export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: UpdateBankAccountPayload) => {
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { ...payload, updatedAt: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
    },
  });
}

/**
 * Hook para deletar conta bancária
 * TODO: Conectar ao banco de dados quando tabela bank_accounts for criada
 */
export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (accountId: string) => {
      // Simula delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { deleted: true, accountId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts-summary'] });
    },
  });
}
