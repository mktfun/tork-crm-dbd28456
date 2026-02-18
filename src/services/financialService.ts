import { supabase } from '@/integrations/supabase/client';
import {
  FinancialAccount,
  FinancialAccountType,
  CashFlowDataPoint,
  FinancialSummary,
  FinancialSummaryWithComparison,
  DreRow,
  BulkImportPayload,
  BulkImportResult
} from '@/types/financeiro';

// ============ TIPOS PARA AS RPCs ============

interface RecentTransaction {
  id: string;
  description: string;
  transaction_date: string;
  reference_number: string | null;
  created_at: string;
  is_void: boolean;
  is_confirmed: boolean;
  total_amount: number;
  account_names: string;
  status: string;
  reconciled: boolean;
}

// ============ CONTAS ============

export async function getAccountsByType(type: FinancialAccountType): Promise<FinancialAccount[]> {
  const { data, error } = await supabase
    .rpc('get_financial_accounts_by_type', { p_type: type });

  if (error) throw error;

  return (data || []).map((acc: any) => ({
    id: acc.id,
    userId: acc.user_id,
    name: acc.name,
    code: acc.code,
    description: acc.description,
    type: acc.type as FinancialAccountType,
    parentId: acc.parent_id,
    isSystem: acc.is_system,
    status: acc.status,
    createdAt: acc.created_at,
    updatedAt: acc.updated_at,
  }));
}

export async function getAllAccounts(): Promise<FinancialAccount[]> {
  const { data, error } = await supabase
    .from('financial_accounts')
    .select('*')
    .eq('status', 'active')
    .order('type')
    .order('name');

  if (error) throw error;

  return (data || []).map((acc: any) => ({
    id: acc.id,
    userId: acc.user_id,
    name: acc.name,
    code: acc.code,
    description: acc.description,
    type: acc.type as FinancialAccountType,
    parentId: acc.parent_id,
    isSystem: acc.is_system,
    status: acc.status,
    createdAt: acc.created_at,
    updatedAt: acc.updated_at,
  }));
}

export async function ensureDefaultAccounts(): Promise<void> {
  const { error } = await supabase.rpc('ensure_default_financial_accounts');
  if (error) throw error;
}

export async function createAccount(account: {
  name: string;
  type: FinancialAccountType;
  code?: string;
  description?: string;
}): Promise<FinancialAccount> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase
    .from('financial_accounts')
    .insert({
      user_id: user.id,
      name: account.name,
      type: account.type,
      code: account.code,
      description: account.description
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    code: data.code,
    description: data.description,
    type: data.type as FinancialAccountType,
    parentId: data.parent_id,
    isSystem: data.is_system ?? false,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ============ TRANSAÇÕES ============

export async function registerExpense(payload: {
  description: string;
  amount: number;
  transactionDate: string;
  expenseAccountId: string;
  assetAccountId: string;
  bankAccountId?: string;
  referenceNumber?: string;
  memo?: string;
  isConfirmed?: boolean;
  ramoId?: string;
  insuranceCompanyId?: string;
  producerId?: string;
}): Promise<string> {
  const movements: Array<{ account_id: string; amount: number; memo?: string }> = [];

  // Lançamento de despesa (sempre ocorre)
  movements.push({ account_id: payload.expenseAccountId, amount: payload.amount, memo: payload.memo });

  // Contrapartida:
  // Se tem banco E está pago => Não lança no ledger de contas (será movido no bank_accounts pela RPC)
  // Se não tem banco OU não está pago => Lança na conta de ativo/passivo informada (ex: Caixa ou Contas a Pagar)
  if (!payload.bankAccountId || !payload.isConfirmed) {
    movements.push({ account_id: payload.assetAccountId, amount: -payload.amount, memo: payload.memo });
  }

  const { data, error } = await supabase.rpc('create_financial_movement', {
    p_description: payload.description,
    p_transaction_date: payload.transactionDate,
    p_movements: movements,
    p_reference_number: payload.referenceNumber || null,
    p_related_entity_type: null,
    p_related_entity_id: null,
    p_bank_account_id: payload.bankAccountId || null,
    p_is_confirmed: payload.isConfirmed ?? false,
    p_ramo_id: payload.ramoId || null,
    p_insurance_company_id: payload.insuranceCompanyId || null,
    p_producer_id: payload.producerId || null
  });

  if (error) throw error;
  return data;
}

export async function registerRevenue(payload: {
  description: string;
  amount: number;
  transactionDate: string;
  revenueAccountId: string;
  assetAccountId: string;
  bankAccountId?: string;
  referenceNumber?: string;
  memo?: string;
  isConfirmed?: boolean;
  ramoId?: string;
  insuranceCompanyId?: string;
  producerId?: string;
}): Promise<string> {
  const movements: Array<{ account_id: string; amount: number; memo?: string }> = [];

  // Contrapartida:
  // Se tem banco E está confirmado => Não lança no ledger de contas (será movido no bank_accounts pela RPC)
  // Se não tem banco OU pendente => Lança na conta de ativo (ex: Comissões a Receber)
  if (!payload.bankAccountId || !payload.isConfirmed) {
    movements.push({ account_id: payload.assetAccountId, amount: payload.amount, memo: payload.memo });
  }

  // Lançamento de receita (sempre ocorre)
  movements.push({ account_id: payload.revenueAccountId, amount: -payload.amount, memo: payload.memo });

  const { data, error } = await supabase.rpc('create_financial_movement', {
    p_description: payload.description,
    p_transaction_date: payload.transactionDate,
    p_movements: movements,
    p_reference_number: payload.referenceNumber || null,
    p_related_entity_type: null,
    p_related_entity_id: null,
    p_bank_account_id: payload.bankAccountId || null,
    p_is_confirmed: payload.isConfirmed ?? false,
    p_ramo_id: payload.ramoId || null,
    p_insurance_company_id: payload.insuranceCompanyId || null,
    p_producer_id: payload.producerId || null
  });

  if (error) throw error;
  return data;
}

export async function createFinancialMovement(payload: {
  description: string;
  amount: number;
  payment_date: string;
  account_id: string; // The category (expense or revenue account id)
  bank_account_id?: string;
  type: 'expense' | 'revenue';
  reference_number?: string;
  memo?: string;
  is_confirmed?: boolean;
  ramo_id?: string;
  insurance_company_id?: string;
  producer_id?: string;
}) {
  // Logic to find a default asset account if bank not provided
  // We need to fetch accounts to find a default one (e.g. 'Caixa').
  // Since this runs on client side (service), we can query supabase directly.

  let assetAccountId = '';

  // Try to find a default asset account (e.g. Caixa)
  const { data: accounts } = await supabase
    .from('financial_accounts')
    .select('id, name, type')
    .eq('status', 'active')
    .eq('type', 'asset');

  if (accounts && accounts.length > 0) {
    const caixa = accounts.find(a => a.name.toLowerCase().includes('caixa'));
    assetAccountId = caixa ? caixa.id : accounts[0].id;
  } else {
    // If no asset account exists, we might fail or let the specific function fail.
    // For now, let's assume one exists or the specific function handles it (it requires it).
    // Warning: registerExpense/Revenue Require 'assetAccountId'.
    console.warn('No asset account found for default counterpart');
  }

  if (payload.type === 'expense') {
    return registerExpense({
      description: payload.description,
      amount: payload.amount,
      transactionDate: payload.payment_date,
      expenseAccountId: payload.account_id,
      assetAccountId: assetAccountId,
      bankAccountId: payload.bank_account_id,
      referenceNumber: payload.reference_number,
      memo: payload.memo,
      isConfirmed: payload.is_confirmed ?? true,
      ramoId: payload.ramo_id,
      insuranceCompanyId: payload.insurance_company_id,
      producerId: payload.producer_id
    });
  } else {
    return registerRevenue({
      description: payload.description,
      amount: payload.amount,
      transactionDate: payload.payment_date,
      revenueAccountId: payload.account_id,
      assetAccountId: assetAccountId,
      bankAccountId: payload.bank_account_id,
      referenceNumber: payload.reference_number,
      memo: payload.memo,
      isConfirmed: payload.is_confirmed ?? true,
      ramoId: payload.ramo_id,
      insuranceCompanyId: payload.insurance_company_id,
      producerId: payload.producer_id
    });
  }
}

export async function getRecentTransactions(params?: {
  limit?: number;
  offset?: number;
  type?: 'expense' | 'revenue';
}): Promise<RecentTransaction[]> {
  const { data, error } = await supabase.rpc('get_recent_financial_transactions', {
    p_limit: params?.limit || 50,
    p_offset: params?.offset || 0,
    p_type: params?.type || null
  });

  if (error) throw error;
  return (data || []).map((tx: any) => ({
    ...tx,
    is_confirmed: tx.is_confirmed ?? (tx.status === 'confirmed'),
    reconciled: tx.reconciled ?? false
  }));
}

// ============ INTERFACE PARA RESULTADO DE ESTORNO ============

export interface ReverseTransactionResult {
  success: boolean;
  reversalId?: string;
  originalId?: string;
  reversedAmount?: number;
  error?: string;
  message?: string;
}

export async function reverseTransaction(
  transactionId: string,
  reason: string
): Promise<ReverseTransactionResult> {
  const { data, error } = await supabase.rpc('void_financial_transaction', {
    p_transaction_id: transactionId,
    p_reason: reason
  });

  if (error) throw error;

  const result = data as any;
  return {
    success: result?.success ?? false,
    reversalId: result?.reversal_id,
    originalId: result?.original_id,
    reversedAmount: result?.reversed_amount,
    error: result?.error,
    message: result?.message
  };
}

/**
 * @deprecated Use reverseTransaction instead
 */
export async function voidTransaction(transactionId: string, reason: string): Promise<void> {
  const result = await reverseTransaction(transactionId, reason);
  if (!result.success) {
    throw new Error(result.error || 'Falha ao estornar transação');
  }
}

// ============ FLUXO DE CAIXA ============

export async function getCashFlowData(params: {
  startDate: string;
  endDate: string;
  granularity?: 'day' | 'month';
}): Promise<CashFlowDataPoint[]> {
  const { data, error } = await supabase.rpc('get_cash_flow_data', {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_granularity: params.granularity || 'day'
  });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    period: row.period,
    income: Number(row.income) || 0,
    expense: Number(row.expense) || 0,
    balance: Number(row.balance) || 0
  }));
}

export async function getFinancialSummary(params: {
  startDate: string;
  endDate: string;
}): Promise<FinancialSummaryWithComparison> {
  const { data, error } = await supabase.rpc('get_financial_summary', {
    p_start_date: params.startDate,
    p_end_date: params.endDate
  });

  if (error) {
    console.error('Error fetching financial summary:', error);
    throw error;
  }

  const raw = data as any || {};
  
  const parseSummary = (obj: any): FinancialSummary => ({
    totalIncome: Number(obj?.totalIncome) || 0,
    totalExpense: Number(obj?.totalExpense) || 0,
    netResult: Number(obj?.netResult) || 0,
    pendingIncome: Number(obj?.pendingIncome) || 0,
    pendingExpense: Number(obj?.pendingExpense) || 0,
    transactionCount: Number(obj?.transactionCount) || 0,
    cashBalance: Number(obj?.cashBalance) || 0,
    globalPendingIncome: Number(obj?.globalPendingIncome) || 0,
    globalPendingExpense: Number(obj?.globalPendingExpense) || 0,
    operationalPendingIncome: Number(obj?.operationalPendingIncome) || 0,
    operationalPendingExpense: Number(obj?.operationalPendingExpense) || 0,
  });

  // Handle both old (flat) and new ({ current, previous }) formats
  if (raw.current) {
    return {
      current: parseSummary(raw.current),
      previous: parseSummary(raw.previous),
    };
  }

  // Fallback for old flat format
  return {
    current: parseSummary(raw),
    previous: parseSummary({}),
  };
}

// ============ DRE ============

export async function getDreData(year?: number): Promise<DreRow[]> {
  const { data, error } = await supabase.rpc('get_dre_data', {
    p_year: year || new Date().getFullYear()
  });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    category: row.category,
    account_type: row.account_type as 'revenue' | 'expense',
    jan: Number(row.jan) || 0,
    fev: Number(row.fev) || 0,
    mar: Number(row.mar) || 0,
    abr: Number(row.abr) || 0,
    mai: Number(row.mai) || 0,
    jun: Number(row.jun) || 0,
    jul: Number(row.jul) || 0,
    ago: Number(row.ago) || 0,
    set: Number(row.set) || 0,
    out: Number(row.out) || 0,
    nov: Number(row.nov) || 0,
    dez: Number(row.dez) || 0,
    total: Number(row.total) || 0
  }));
}

// ============ IMPORTAÇÃO EM MASSA ============

export async function bulkImportTransactions(
  payload: BulkImportPayload
): Promise<BulkImportResult> {
  const transactions = payload.transactions.map(tx => ({
    description: tx.description,
    transaction_date: tx.transactionDate,
    amount: tx.amount,
    asset_account_id: payload.assetAccountId,
    category_account_id: tx.categoryAccountId,
    reference_number: tx.referenceNumber || null,
    memo: tx.memo || null
  }));

  const { data, error } = await supabase.rpc('bulk_create_financial_movements', {
    p_transactions: transactions
  });

  if (error) throw error;

  const result = data as any;

  return {
    successCount: result.success_count || 0,
    errorCount: result.error_count || 0,
    totalProcessed: result.total_processed || 0,
    errors: result.errors || []
  };
}

// ============ GESTÃO DE CONTAS ============

export async function updateAccount(accountId: string, updates: {
  name: string;
  code?: string;
  description?: string;
}): Promise<FinancialAccount> {
  const { data, error } = await supabase.rpc('update_financial_account', {
    p_account_id: accountId,
    p_name: updates.name,
    p_code: updates.code || null,
    p_description: updates.description || null
  });

  if (error) throw error;

  const acc = data as any;
  return {
    id: acc.id,
    userId: acc.user_id,
    name: acc.name,
    code: acc.code,
    description: acc.description,
    type: acc.type as FinancialAccountType,
    parentId: acc.parent_id,
    isSystem: acc.is_system ?? false,
    status: acc.status,
    createdAt: acc.created_at,
    updatedAt: acc.updated_at,
  };
}

export async function archiveAccount(accountId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('archive_financial_account', {
    p_account_id: accountId
  });

  if (error) throw error;
  return data;
}

// ============ SAFE DELETE E RECEITAS ============

interface SafeDeleteResult {
  success: boolean;
  error?: string;
  entryCount?: number;
  requiresMigration?: boolean;
  migratedEntries?: number;
  message?: string;
}

export async function countLedgerEntriesByAccount(accountId: string): Promise<number> {
  const { data, error } = await supabase.rpc('count_ledger_entries_by_account', {
    p_account_id: accountId
  });

  if (error) throw error;
  return data || 0;
}

export async function deleteAccountSafe(
  targetAccountId: string,
  migrateToAccountId?: string
): Promise<SafeDeleteResult> {
  const { data, error } = await supabase.rpc('delete_financial_account_safe', {
    p_target_account_id: targetAccountId,
    p_migrate_to_account_id: migrateToAccountId || null
  });

  if (error) throw error;

  const result = data as any;
  return {
    success: result.success,
    error: result.error,
    entryCount: result.entry_count,
    requiresMigration: result.requires_migration,
    migratedEntries: result.migrated_entries,
    message: result.message
  };
}

export interface RevenueTransaction {
  id: string;
  description: string;
  transaction_date: string;
  amount: number;
  account_name: string | null;
  is_confirmed: boolean;
  legacy_status: string | null;
  client_name: string | null;
  policy_number: string | null;
  related_entity_id: string | null;
  related_entity_type: string | null;
  reconciled: boolean;
  bankName?: string | null;
}

export async function getRevenueTransactions(params: {
  startDate: string;
  endDate: string;
  limit?: number;
}): Promise<RevenueTransaction[]> {
  const { data, error } = await supabase.rpc('get_revenue_transactions', {
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_limit: params.limit || 100
  });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    description: row.description || '',
    transaction_date: row.transaction_date,
    amount: Number(row.amount) || 0,
    account_name: row.account_name || null,
    is_confirmed: row.is_confirmed ?? false,
    legacy_status: row.legacy_status || null,
    client_name: row.client_name || null,
    policy_number: row.policy_number || null,
    related_entity_id: row.related_entity_id || null,
    related_entity_type: row.related_entity_type || null,
    reconciled: row.reconciled ?? false,
    bankName: row.bank_name || null
  }));
}

interface RevenueTotals {
  financialTotal: number;
  legacyTotal: number;
}

export async function getRevenueTotals(params: {
  startDate: string;
  endDate: string;
}): Promise<RevenueTotals> {
  const { data, error } = await supabase.rpc('get_revenue_totals', {
    p_start_date: params.startDate,
    p_end_date: params.endDate
  });

  if (error) throw error;

  const row = (data as any)?.[0] || {};
  return {
    financialTotal: Number(row.financial_total) || 0,
    legacyTotal: Number(row.legacy_total) || 0
  };
}


// ============ LIQUIDAÇÃO (BAIXA) DE COMISSÕES ============

interface SettleCommissionResult {
  success: boolean;
  settledAmount?: number;
  message?: string;
}

export async function settleCommission(params: {
  transactionId: string;
  bankAccountId: string;
  settlementDate?: string;
}): Promise<SettleCommissionResult> {
  console.log('📡 SERVICE - Chamando RPC settle_commission_transaction:', {
    p_transaction_id: params.transactionId,
    p_bank_account_id: params.bankAccountId
  });

  const { data, error } = await supabase.rpc('settle_commission_transaction', {
    p_transaction_id: params.transactionId,
    p_bank_account_id: params.bankAccountId
  });

  console.log('📡 SERVICE - Resposta RPC:', { data, error });

  if (error) {
    console.error('📡 SERVICE - Erro RPC:', error);
    throw error;
  }

  const result = data as any;
  return {
    success: result?.success ?? false,
    settledAmount: result?.amount,
    message: result?.message
  };
}

interface TransactionDetails {
  id: string;
  description: string;
  transactionDate: string;
  referenceNumber: string | null;
  relatedEntityId: string | null;
  relatedEntityType: string | null;
  isVoid: boolean;
  voidReason: string | null;
  createdAt: string;
  amount: number;
  attachments: string[];
  ledgerEntries: Array<{
    id: string;
    amount: number;
    memo: string | null;
    accountId: string;
    accountName: string;
    accountType: string;
  }>;
  legacyData: {
    clientId: string | null;
    clientName: string | null;
    policyId: string | null;
    policyNumber: string | null;
    ramo: string | null;
    company: string | null;
    originalAmount: number | null;
    originalStatus: string | null;
  } | null;
}

export async function getTransactionDetails(
  transactionId?: string | null,
  legacyId?: string | null
): Promise<TransactionDetails> {
  const { data, error } = await supabase.rpc('get_transaction_details', {
    p_transaction_id: transactionId || null,
    p_legacy_id: legacyId || null
  });

  if (error) {
    console.warn("RPC get_transaction_details falhou, tentando fallback...", error);

    const id = transactionId || legacyId;
    if (!id) throw new Error("ID da transação não fornecido");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const { data: tx, error: txError } = await supabase
      .from('financial_transactions')
      .select(`
        *,
        financial_ledger (
          id, amount, memo, account_id,
          financial_accounts ( name, type )
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (txError) throw txError;

    const totalAmount = tx.total_amount ?? 0;
    return {
      id: tx.id,
      description: tx.description || '',
      transactionDate: tx.transaction_date,
      referenceNumber: tx.reference_number,
      relatedEntityId: tx.related_entity_id,
      relatedEntityType: tx.related_entity_type,
      isVoid: tx.is_void ?? false,
      voidReason: tx.void_reason,
      createdAt: tx.created_at,
      attachments: tx.attachments || [],
      ledgerEntries: (tx.financial_ledger || []).map((l: any) => ({
        id: l.id,
        amount: l.amount,
        memo: l.memo,
        accountId: l.account_id,
        accountName: l.financial_accounts?.name || 'Conta Desconhecida',
        accountType: l.financial_accounts?.type || 'unknown'
      })),
      amount: Math.abs(totalAmount),
      legacyData: null
    };
  }

  const raw = data as any;

  if (raw?.error) {
    throw new Error(raw.error);
  }

  const rawMovements = raw.ledgerEntries || raw.ledger_entries || [];
  const rawLegacy = raw.legacyData || raw.legacy_data;

  const rawAmount = raw.total_amount || raw.totalAmount || rawMovements.reduce((acc: number, e: any) => {
    const t = e.accountType || e.account_type || '';
    return (t === 'revenue' || t === 'expense') ? acc + Math.abs(e.amount) : acc;
  }, 0);

  return {
    id: raw.id,
    description: raw.description,
    transactionDate: raw.transactionDate || raw.transaction_date,
    referenceNumber: raw.referenceNumber || raw.reference_number,
    relatedEntityId: raw.relatedEntityId || raw.related_entity_id,
    relatedEntityType: raw.relatedEntityType || raw.related_entity_type,
    isVoid: raw.isVoid ?? raw.is_void ?? false,
    voidReason: raw.voidReason || raw.void_reason,
    createdAt: raw.createdAt || raw.created_at,
    amount: rawAmount,
    attachments: raw.attachments || [],
    ledgerEntries: rawMovements.map((entry: any) => ({
      id: entry.id,
      amount: entry.amount,
      memo: entry.memo,
      accountId: entry.accountId || entry.account_id,
      accountName: entry.accountName || entry.account_name || 'Conta Desconhecida',
      accountType: entry.accountType || entry.account_type || 'unknown'
    })),
    legacyData: rawLegacy ? {
      clientId: rawLegacy.clientId || rawLegacy.client_id,
      clientName: rawLegacy.clientName || rawLegacy.client_name,
      policyId: rawLegacy.policyId || rawLegacy.policy_id,
      policyNumber: rawLegacy.policyNumber || rawLegacy.policy_number,
      ramo: rawLegacy.ramo,
      company: rawLegacy.company,
      originalAmount: rawLegacy.originalAmount || rawLegacy.original_amount || rawLegacy.amount,
      originalStatus: rawLegacy.originalStatus || rawLegacy.original_status || rawLegacy.status
    } : null
  };
}

// Buscar totais pendentes (A Receber e A Pagar)
export async function getPendingTotals(startDate?: string, endDate?: string) {
  const { data, error } = await supabase.rpc('get_pending_totals', {
    p_start_date: startDate || null,
    p_end_date: endDate || null
  });

  if (error) throw error;
  return data as {
    total_a_receber: number;
    total_a_pagar: number;
    count_a_receber: number;
    count_a_pagar: number;
  };
}

// Buscar cash flow com projeção
export async function getCashFlowWithProjection(
  startDate: string,
  endDate: string,
  granularity: 'day' | 'month' = 'day'
) {
  const { data, error } = await supabase.rpc('get_cash_flow_with_projection', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_granularity: granularity
  });

  if (error) throw error;
  return data as Array<{
    period: string;
    income: number;
    expense: number;
    pending_income: number;
    pending_expense: number;
    net: number;
    projected_net: number;
  }>;
}

// ============ NOVOS KPIs: TOTAL GERAL E MÊS ATUAL ============

export async function getTotalPendingReceivables(): Promise<{
  total_amount: number;
  pending_count: number;
}> {
  const { data, error } = await supabase.rpc('get_total_pending_receivables');

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_amount: Number(row?.total_amount || 0),
    pending_count: Number(row?.pending_count || 0)
  };
}

export async function getPendingThisMonth(): Promise<{
  total_amount: number;
  pending_count: number;
}> {
  const { data, error } = await supabase.rpc('get_pending_this_month');

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    total_amount: Number(row?.total_amount || 0),
    pending_count: Number(row?.pending_count || 0)
  };
}

// ============ AUDITORIA CONTÁBIL ============

export interface LedgerIntegrityIssue {
  issue_type: 'UNBALANCED_TRANSACTION' | 'NEGATIVE_ASSET_BALANCE' | 'ORPHAN_TRANSACTION';
  transaction_id: string | null;
  account_id: string | null;
  description: string;
  amount: number;
}

export async function auditLedgerIntegrity(): Promise<LedgerIntegrityIssue[]> {
  const { data, error } = await supabase.rpc('audit_ledger_integrity');

  if (error) throw error;

  return (data || []).map((row: any) => ({
    issue_type: row.issue_type,
    transaction_id: row.transaction_id,
    account_id: row.account_id,
    description: row.description,
    amount: Number(row.amount) || 0
  }));
}

// ============ CONTAS A PAGAR E RECEBER ============

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

export async function getPayableReceivableTransactions(
  transactionType: 'all' | 'receber' | 'pagar' = 'all',
  statusFilter: 'all' | 'atrasado' | 'pendente' | 'pago' = 'all'
): Promise<PayableReceivableTransaction[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error('Usuário não autenticado');

  // Usar a RPC que faz JOIN correto com transactions legado para pegar client_name
  const { data, error } = await supabase.rpc('get_payable_receivable_transactions', {
    p_user_id: user.user.id,
    p_transaction_type: transactionType === 'all' ? null : transactionType,
    p_status: statusFilter === 'all' ? null : statusFilter
  });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    transactionId: row.transaction_id,
    transactionType: row.transaction_type as 'receber' | 'pagar',
    dueDate: row.due_date,
    entityName: row.entity_name || 'Não especificado',
    description: row.description || '',
    amount: Math.abs(Number(row.amount) || 0),
    status: row.status as 'atrasado' | 'pendente' | 'pago',
    daysOverdue: Number(row.days_overdue) || 0,
  }));
}

