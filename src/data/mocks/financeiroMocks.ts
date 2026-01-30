/**
 * Dados Mock para o Módulo Financeiro
 * 
 * Este arquivo centraliza todos os dados mock usados nas telas financeiras.
 * Facilita a manutenção e a futura substituição por dados reais do backend.
 */

// ============ INTERFACES ============

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  agency?: string;
  accountType: 'corrente' | 'poupanca' | 'digital' | 'investimento';
  balance: number;
  label: string; // "Conta Principal", "Conta Operacional", etc.
  color: string;
  icon: string; // emoji
  isActive: boolean;
}

export interface BankTransaction {
  id: string;
  date: string;
  bankName: string;
  type: 'entrada' | 'saida';
  description: string;
  category: string;
  amount: number;
  reconciliationStatus: 'conciliado' | 'pendente' | 'divergente';
}

export interface Receivable {
  id: string;
  date: string; // ISO date
  entity: string; // seguradora/cliente
  description: string;
  amount: number;
  daysUntilDue: number;
}

export interface AgingBucket {
  range: '5' | '15' | '30' | '60+';
  amount: number;
  color: string;
}

export interface AccountTransaction {
  id: string;
  type: 'receber' | 'pagar';
  dueDate: string; // ISO date
  entity: string;
  description: string;
  amount: number;
  status: 'atrasado' | 'pendente' | 'pago';
}

export interface StatementTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saida';
  matched: boolean;
}

export interface SystemTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  category: string;
  matched: boolean;
}

// ============ MOCK DATA ============

export const mockBankAccounts: BankAccount[] = [
  {
    id: '1',
    bankName: 'Itaú',
    accountNumber: '12345-6',
    agency: '0001',
    accountType: 'corrente',
    balance: 187432.50,
    label: 'Conta Principal',
    color: '#FF6B00',
    icon: '🏦',
    isActive: true,
  },
  {
    id: '2',
    bankName: 'Bradesco',
    accountNumber: '78901-2',
    agency: '0234',
    accountType: 'corrente',
    balance: 54210.80,
    label: 'Conta Operacional',
    color: '#CC092F',
    icon: '🏛️',
    isActive: true,
  },
  {
    id: '3',
    bankName: 'Cora',
    accountNumber: '34567-8',
    accountType: 'digital',
    balance: 23150.00,
    label: 'Conta Digital',
    color: '#FE3E6D',
    icon: '💳',
    isActive: true,
  },
  {
    id: '4',
    bankName: 'Nubank',
    accountNumber: '90123-4',
    accountType: 'digital',
    balance: 45000.00,
    label: 'Conta Reserva',
    color: '#820AD1',
    icon: '💜',
    isActive: true,
  },
];

export const mockBankTransactions: BankTransaction[] = [
  {
    id: '1',
    date: '2026-01-30',
    bankName: 'Itaú',
    type: 'entrada',
    description: 'Comissão Porto Seguro - Lote 2024/01',
    category: 'Comissões Recebidas',
    amount: 4200.00,
    reconciliationStatus: 'conciliado',
  },
  {
    id: '2',
    date: '2026-01-30',
    bankName: 'Itaú',
    type: 'saida',
    description: 'Aluguel escritório Jan/2024',
    category: 'Aluguel',
    amount: -1500.00,
    reconciliationStatus: 'conciliado',
  },
  {
    id: '3',
    date: '2026-01-30',
    bankName: 'Bradesco',
    type: 'saida',
    description: 'Despesa operacional',
    category: 'Aluguel',
    amount: -5995.00,
    reconciliationStatus: 'pendente',
  },
  {
    id: '4',
    date: '2026-01-29',
    bankName: 'Bradesco',
    type: 'entrada',
    description: 'Comissão Bradesco - Saúde Coletivo',
    category: 'Comissões Recebidas',
    amount: 8500.00,
    reconciliationStatus: 'conciliado',
  },
  {
    id: '5',
    date: '2026-01-28',
    bankName: 'Cora',
    type: 'saida',
    description: 'Repasse Corretor Parceiro - Dez/2023',
    category: 'Repasse Agentes',
    amount: -3200.00,
    reconciliationStatus: 'pendente',
  },
  {
    id: '6',
    date: '2026-01-28',
    bankName: 'Nubank',
    type: 'entrada',
    description: 'Transferência recebida',
    category: 'Impostos',
    amount: 570.00,
    reconciliationStatus: 'divergente',
  },
  {
    id: '7',
    date: '2026-01-27',
    bankName: 'Itaú',
    type: 'entrada',
    description: 'Comissão SulAmérica - Saúde Empresarial',
    category: 'Comissões Recebidas',
    amount: 15000.00,
    reconciliationStatus: 'conciliado',
  },
];

export const mockReceivables: Receivable[] = [
  {
    id: '1',
    date: '2026-02-04',
    entity: 'Porto Seguro',
    description: 'Comissão Auto - Lote Janeiro',
    amount: 12500.00,
    daysUntilDue: 5,
  },
  {
    id: '2',
    date: '2026-02-09',
    entity: 'Bradesco Seguros',
    description: 'Comissão Saúde - Lote Janeiro',
    amount: 8700.00,
    daysUntilDue: 10,
  },
  {
    id: '3',
    date: '2026-02-14',
    entity: 'SulAmérica',
    description: 'Comissão Vida Coletivo',
    amount: 22000.00,
    daysUntilDue: 15,
  },
  {
    id: '4',
    date: '2026-02-19',
    entity: 'Tokio Marine',
    description: 'Comissão RE Empresarial',
    amount: 5400.00,
    daysUntilDue: 20,
  },
  {
    id: '5',
    date: '2026-02-24',
    entity: 'Allianz',
    description: 'Comissão Auto Premium',
    amount: 9800.00,
    daysUntilDue: 25,
  },
  {
    id: '6',
    date: '2026-02-27',
    entity: 'HDI',
    description: 'Comissão Residencial',
    amount: 6500.00,
    daysUntilDue: 28,
  },
];

export const mockAgingReport: AgingBucket[] = [
  { range: '5', amount: 2500, color: '#FCD34D' },
  { range: '15', amount: 8500, color: '#FB923C' },
  { range: '30', amount: 4200, color: '#F87171' },
  { range: '60+', amount: 15000, color: '#DC2626' },
];

export const mockAccountsPayableReceivable: AccountTransaction[] = [
  {
    id: '1',
    type: 'receber',
    dueDate: '2025-12-26',
    entity: 'Transportadora XYZ',
    description: 'Seguro Frota - Parcela única',
    amount: 15000.00,
    status: 'atrasado',
  },
  {
    id: '2',
    type: 'receber',
    dueDate: '2026-01-05',
    entity: 'Cliente VIP',
    description: 'Prêmio anual parcelado',
    amount: 4200.00,
    status: 'atrasado',
  },
  {
    id: '3',
    type: 'receber',
    dueDate: '2026-01-18',
    entity: 'Empresa ABC Ltda',
    description: 'Seguro Empresarial - Parcela 2',
    amount: 8500.00,
    status: 'atrasado',
  },
  {
    id: '4',
    type: 'receber',
    dueDate: '2026-02-04',
    entity: 'Porto Seguro',
    description: 'Comissão Auto - Lote Janeiro',
    amount: 12500.00,
    status: 'pendente',
  },
  {
    id: '5',
    type: 'pagar',
    dueDate: '2026-02-04',
    entity: 'Imobiliária Central',
    description: 'Aluguel Fevereiro',
    amount: -4500.00,
    status: 'pendente',
  },
  {
    id: '6',
    type: 'receber',
    dueDate: '2026-02-09',
    entity: 'Bradesco Seguros',
    description: 'Comissão Saúde - Lote Janeiro',
    amount: 8700.00,
    status: 'pendente',
  },
  {
    id: '7',
    type: 'pagar',
    dueDate: '2026-02-09',
    entity: 'Funcionários',
    description: 'Folha de Pagamento',
    amount: -28000.00,
    status: 'pendente',
  },
];

export const mockStatementTransactions: StatementTransaction[] = [
  {
    id: 's1',
    date: '2026-01-30',
    description: 'PIX RECEBIDO - PORTO SEGURO',
    amount: 4200.00,
    type: 'entrada',
    matched: false,
  },
  {
    id: 's2',
    date: '2026-01-30',
    description: 'TED - IMOBILIARIA CENTRAL',
    amount: -1500.00,
    type: 'saida',
    matched: false,
  },
  {
    id: 's3',
    date: '2026-01-29',
    description: 'DEP BRADESCO SEGUROS',
    amount: 8500.00,
    type: 'entrada',
    matched: false,
  },
  {
    id: 's4',
    date: '2026-01-28',
    description: 'PIX ENVIADO - CORRETOR PARCEIRO',
    amount: -3200.00,
    type: 'saida',
    matched: false,
  },
];

export const mockSystemTransactions: SystemTransaction[] = [
  {
    id: 't1',
    date: '2026-01-30',
    description: 'Comissão Porto Seguro - Lote 2024/01',
    amount: 4200.00,
    type: 'receita',
    category: 'Comissões',
    matched: false,
  },
  {
    id: 't2',
    date: '2026-01-30',
    description: 'Aluguel escritório Jan/2024',
    amount: 1500.00,
    type: 'despesa',
    category: 'Aluguel',
    matched: false,
  },
  {
    id: 't3',
    date: '2026-01-29',
    description: 'Comissão Bradesco - Saúde Coletivo',
    amount: 8500.00,
    type: 'receita',
    category: 'Comissões',
    matched: false,
  },
  {
    id: 't4',
    date: '2026-01-28',
    description: 'Repasse Corretor Parceiro',
    amount: 3200.00,
    type: 'despesa',
    category: 'Repasses',
    matched: false,
  },
];

// ============ HELPER FUNCTIONS ============

export function getTotalBalance(): number {
  return mockBankAccounts.reduce((sum, account) => sum + account.balance, 0);
}

export function getTotalReceivables(): number {
  return mockReceivables.reduce((sum, r) => sum + r.amount, 0);
}

export function getTotalAging(): number {
  return mockAgingReport.reduce((sum, bucket) => sum + bucket.amount, 0);
}

export function getReconciliationProgress(): number {
  const total = mockBankTransactions.length;
  const reconciled = mockBankTransactions.filter(t => t.reconciliationStatus === 'conciliado').length;
  return Math.round((reconciled / total) * 100);
}
