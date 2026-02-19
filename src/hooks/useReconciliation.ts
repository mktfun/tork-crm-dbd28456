import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

// ============ TIPOS ============

export interface BankStatementEntry {
    id: string;
    bank_account_id: string;
    transaction_date: string;
    description: string;
    amount: number;
    reference_number: string | null;
    reconciliation_status: 'pending' | 'matched' | 'manual_match' | 'ignored' | 'divergent';
    matched_transaction_id: string | null;
    matched_at: string | null;
    match_confidence: number | null;
    notes: string | null;
    created_at: string;
}

// ...
export interface PendingReconciliationItem {
    source: 'statement' | 'system';
    id: string;
    transaction_date: string;
    description: string;
    amount: number;
    reference_number: string | null;
    status: string;
    matched_id: string | null;
    type: 'revenue' | 'expense' | 'receita' | 'despesa';
    bank_account_id?: string | null;
    // Rich policy details (from RPC)
    total_amount?: number | null;
    paid_amount?: number | null;
    remaining_amount?: number | null;
    customer_name?: string | null;
    insurer_name?: string | null;
    branch_name?: string | null;
    item_name?: string | null;
}
// ...



export interface MatchSuggestion {
    statement_entry_id: string;
    system_transaction_id: string;
    statement_description: string;
    system_description: string;
    statement_amount: number;
    system_amount: number;
    date_diff: number;
    amount_diff: number;
    confidence: number;
}

export interface ReconciliationDashboardItem {
    bank_account_id: string;
    bank_name: string;
    account_number: string | null;
    current_balance: number;
    statement_entries_count: number;
    pending_reconciliation: number;
    already_matched: number;
    statement_total: number;
    system_entries_count: number;
    unreconciled_system: number;
    system_total: number;
    diff_amount: number;
    reconciliation_status: 'fully_reconciled' | 'pending' | 'no_data';
}

// ============ HOOKS ============

/**
 * Hook para buscar o dashboard de reconciliação
 */
export function useReconciliationDashboard() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['reconciliation-dashboard', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('reconciliation_dashboard' as any)
                .select('*');

            if (error) {
                console.error('Erro ao buscar dashboard de reconciliação:', error);
                throw error;
            }

            return (data || []) as unknown as ReconciliationDashboardItem[];
        },
        enabled: !!user,
        staleTime: 60 * 1000,
    });
}

/**
 * Hook para buscar transações pendentes de reconciliação
 */
export function usePendingReconciliation(
    bankAccountId: string | null,
    startDate?: string,
    endDate?: string,
    includeUnassigned: boolean = false
) {
    const { user } = useAuth();

    const isConsolidated = !bankAccountId;

    return useQuery({
        queryKey: ['pending-reconciliation', user?.id, bankAccountId, startDate, endDate, includeUnassigned],
        queryFn: async () => {
            if (!user) return { statement: [], system: [] };

            let systemPromise: any;
            let statementQuery: any;

            if (isConsolidated) {
                // Mode A: Consolidated - fetch ALL items where bank_account_id IS NULL
                systemPromise = (supabase.rpc as any)('get_transactions_for_reconciliation', {
                    p_bank_account_id: null,
                    p_include_unassigned: true
                });

                statementQuery = supabase
                    .from('bank_statement_entries')
                    .select('*')
                    .eq('reconciliation_status', 'pending')
                    .is('bank_account_id', null);
            } else {
                // Mode B: Specific bank - fetch items for that bank + optionally unassigned
                systemPromise = (supabase.rpc as any)('get_transactions_for_reconciliation', {
                    p_bank_account_id: bankAccountId,
                    p_include_unassigned: includeUnassigned
                });

                statementQuery = supabase
                    .from('bank_statement_entries')
                    .select('*')
                    .eq('reconciliation_status', 'pending')
                    .or(`bank_account_id.eq.${bankAccountId},bank_account_id.is.null`);
            }

            if (startDate && endDate) {
                statementQuery = statementQuery
                    .gte('transaction_date', startDate)
                    .lte('transaction_date', endDate);
            }

            const statementPromise = statementQuery;

            const [systemResult, statementResult] = await Promise.all([systemPromise, statementPromise]);

            if (systemResult.error) {
                console.error('Erro ao buscar sistema:', systemResult.error);
                throw systemResult.error;
            }
            if (statementResult.error) {
                console.error('Erro ao buscar extrato:', statementResult.error);
                throw statementResult.error;
            }

            // Mapear Sistema (nomes simplificados)
            const systemItems: PendingReconciliationItem[] = (systemResult.data || []).map((item: any) => {
                const itemType = item.type || (item.amount < 0 ? 'expense' : 'revenue');
                const remainingAmt = item.remaining_amount ?? item.amount;
                const signedAmount = (itemType === 'expense' || itemType === 'despesa')
                    ? -Math.abs(remainingAmt)
                    : Math.abs(remainingAmt);
                return {
                    source: 'system',
                    id: item.id,
                    transaction_date: item.transaction_date,
                    description: item.description,
                    amount: signedAmount,
                    reference_number: null,
                    status: item.status || 'pending',
                    matched_id: null,
                    type: itemType,
                    bank_account_id: item.bank_account_id || null,
                    total_amount: item.total_amount ?? null,
                    paid_amount: item.paid_amount ?? null,
                    remaining_amount: item.remaining_amount ?? null,
                    customer_name: item.customer_name ?? null,
                    insurer_name: item.insurer_name ?? null,
                    branch_name: item.branch_name ?? null,
                    item_name: item.item_name ?? null,
                };
            });

            // Mapear Extrato
            const statementItems: PendingReconciliationItem[] = (statementResult.data || []).map((item: any) => ({
                source: 'statement',
                id: item.id,
                transaction_date: item.transaction_date,
                description: item.description,
                amount: item.amount,
                reference_number: item.reference_number,
                status: item.reconciliation_status,
                matched_id: item.matched_transaction_id,
                type: item.amount < 0 ? 'expense' : 'revenue',
                bank_account_id: item.bank_account_id || null,
            }));

            return {
                statement: statementItems,
                system: systemItems,
            };
        },
        enabled: !!user,
        staleTime: 30 * 1000,
    });
}

/**
 * Hook para buscar sugestões de match automático
 */
export function useMatchSuggestions(
    bankAccountId: string | null,
    toleranceDays = 3,
    toleranceAmount = 0.01
) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['match-suggestions', user?.id, bankAccountId, toleranceDays, toleranceAmount],
        queryFn: async () => {
            if (!user || !bankAccountId) return [];

            const { data, error } = await (supabase.rpc as any)('suggest_reconciliation_matches', {
                p_bank_account_id: bankAccountId,
                p_tolerance_days: toleranceDays,
                p_tolerance_amount: toleranceAmount,
            });

            if (error) {
                console.error('Erro ao buscar sugestões:', error);
                throw error;
            }

            return (data || []) as MatchSuggestion[];
        },
        enabled: !!user && !!bankAccountId,
        staleTime: 60 * 1000,
    });
}

/**
 * Hook para buscar entradas do extrato bancário
 */
export function useBankStatementEntries(
    bankAccountId: string | null,
    status?: string
) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['bank-statement-entries', user?.id, bankAccountId, status],
        queryFn: async () => {
            if (!user || !bankAccountId) return [];

            let query = (supabase as any)
                .from('bank_statement_entries' as any)
                .select('*')
                .eq('bank_account_id', bankAccountId)
                .order('transaction_date', { ascending: false });

            if (status) {
                query = query.eq('reconciliation_status', status);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Erro ao buscar entradas do extrato:', error);
                throw error;
            }

            return (data || []) as BankStatementEntry[];
        },
        enabled: !!user && !!bankAccountId,
        staleTime: 30 * 1000,
    });
}

/**
 * Hook para buscar extrato detalhado com auditoria e saldo progressivo
 */
export interface DetailedStatementItem {
    id: string;
    transaction_date: string;
    document_number: string | null;
    description: string;
    category_name: string;
    revenue_amount: number;
    expense_amount: number;
    running_balance: number;
    status: string;
    reconciled: boolean;
    method: string;
    bank_account_id: string | null;
}

export function useBankStatementDetailed(
    bankAccountId: string | null,
    startDate: string,
    endDate: string
) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['bank-statement-detailed', user?.id, bankAccountId, startDate, endDate],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await (supabase.rpc as any)('get_bank_statement_detailed', {
                p_bank_account_id: bankAccountId && bankAccountId.length > 0 ? bankAccountId : null,
                p_start_date: startDate,
                p_end_date: endDate
            });

            if (error) {
                console.error('Erro ao buscar extrato detalhado:', error);
                throw error;
            }

            return (data || []) as DetailedStatementItem[];
        },
        enabled: !!user && !!startDate && !!endDate,
        staleTime: 30 * 1000,
    });
}

/**
 * Interface para o extrato paginado
 */
export interface PaginatedStatementItem {
    id: string;
    transaction_date: string;
    bank_name: string;
    type: string;
    description: string;
    category_name: string;
    amount: number;
    running_balance: number;
    status_display: string;
    reconciled: boolean;
    bank_account_id: string | null;
    total_count: number;
    reconciled_by_name?: string | null;
}

/**
 * Hook para buscar extrato paginado com metadados de banco
 */
export function useBankStatementPaginated(
    bankAccountId: string | null,
    startDate: string,
    endDate: string,
    page: number = 1,
    pageSize: number = 20,
    searchTerm: string = '',
    status: string = 'todas',
    type: string = 'todos'
) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['bank-statement-paginated', user?.id, bankAccountId, startDate, endDate, page, pageSize, searchTerm, status, type],
        queryFn: async () => {
            if (!user) return { items: [], totalCount: 0 };

            const safeBank = bankAccountId && bankAccountId.length > 0 && bankAccountId !== 'all' ? bankAccountId : null;

            const { data, error } = await (supabase.rpc as any)('get_bank_statement_paginated', {
                p_bank_account_id: safeBank,
                p_start_date: startDate,
                p_end_date: endDate,
                p_page: page,
                p_page_size: pageSize,
                p_search_term: searchTerm || null,
                p_status: status,
                p_type: type
            });

            if (error) {
                console.error('Erro ao buscar extrato paginado:', error);
                throw error;
            }

            const items = (data || []) as PaginatedStatementItem[];
            const totalCount = items.length > 0 ? items[0].total_count : 0;

            return { items, totalCount };
        },
        enabled: !!user && !!startDate && !!endDate,
        staleTime: 30 * 1000,
    });
}

/**
 * Mutation para conciliar transações manualmente
 */
export function useReconcileManual() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            statementEntryId,
            systemTransactionId,
        }: {
            statementEntryId: string;
            systemTransactionId: string;
        }) => {
            const { data, error } = await (supabase.rpc as any)('reconcile_transactions', {
                p_statement_entry_id: statementEntryId,
                p_system_transaction_id: systemTransactionId,
            });

            if (error) throw error;

            const result = data as { success: boolean; error?: string; message?: string };
            if (!result.success) {
                throw new Error(result.error || 'Falha ao conciliar');
            }

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['match-suggestions'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });
            toast.success('Transações conciliadas com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao conciliar: ${error.message}`);
        },
    });
}

/**
 * Mutation para conciliar transação diretamente (SEM match com extrato)
 */
export function useReconcileTransactionDirectly() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ transactionId, bankAccountId }: { transactionId: string; bankAccountId?: string }) => {
            // SEMPRE enviar p_bank_account_id (mesmo null) para PostgREST resolver a assinatura correta
            const { data, error } = await (supabase.rpc as any)('manual_reconcile_transaction', {
                p_transaction_id: transactionId,
                p_bank_account_id: bankAccountId || null,
            });

            if (error) throw error;

            return { success: true };
        },
        onSuccess: () => {
            // Invalida TODAS as queries financeiras (prefix match, não exact)
            queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['transactions-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-financial-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['account-balances'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-detailed'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-paginated'] });

            toast.success('Transação conciliada e saldo bancário atualizado!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao conciliar: ${error.message}`);
        },
    });
}

/**
 * Mutation para desfazer conciliação (Estorno)
 */
export function useUnreconcileTransaction() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (systemTransactionId: string) => {
            const { data, error } = await (supabase.rpc as any)('unreconcile_transaction', {
                p_transaction_id: systemTransactionId,
            });

            if (error) throw error;

            return { success: true };
        },
        onSuccess: () => {
            // Invalida TODAS as queries financeiras
            queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['transactions-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-financial-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['account-balances'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-detailed'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-paginated'] });

            toast.success('Conciliação desfeita com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao desfazer conciliação: ${error.message}`);
        },
    });
}

/**
 * Mutation para ignorar entrada do extrato
 */
export function useIgnoreEntry() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            statementEntryId,
            notes,
        }: {
            statementEntryId: string;
            notes?: string;
        }) => {
            const { data, error } = await (supabase.rpc as any)('ignore_statement_entry', {
                p_statement_entry_id: statementEntryId,
                p_notes: notes || null,
            });

            if (error) throw error;

            const result = data as { success: boolean; error?: string };
            if (!result.success) {
                throw new Error(result.error || 'Falha ao ignorar');
            }

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });
            toast.success('Entrada marcada como ignorada');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao ignorar: ${error.message}`);
        },
    });
}

/**
 * Mutation para criar transação a partir de entrada do extrato
 */
export function useCreateFromStatement() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            statementEntryId,
            categoryAccountId,
            description,
        }: {
            statementEntryId: string;
            categoryAccountId: string;
            description?: string;
        }) => {
            const { data, error } = await (supabase.rpc as any)('create_transaction_from_statement', {
                p_statement_entry_id: statementEntryId,
                p_category_account_id: categoryAccountId,
                p_description: description || null,
            });

            if (error) throw error;

            const result = data as { success: boolean; transaction_id?: string; error?: string };
            if (!result.success) {
                throw new Error(result.error || 'Falha ao criar transação');
            }

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['account-balances'] });
            toast.success('Transação criada e conciliada!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao criar transação: ${error.message}`);
        },
    });
}

/**
 * Mutation para importar entradas do extrato
 */
export function useImportStatementEntries() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({
            bankAccountId,
            entries,
            fileName,
        }: {
            bankAccountId: string;
            fileName?: string;
            entries: Array<{
                transaction_date: string;
                description: string;
                amount: number;
                reference_number?: string;
            }>;
        }) => {
            if (!user) throw new Error('Usuário não autenticado');

            const totalAmount = entries.reduce((s, e) => s + Math.abs(e.amount), 0);

            // Use the batch RPC if available
            const { data, error } = await (supabase.rpc as any)('import_bank_statement_batch', {
                p_bank_account_id: bankAccountId,
                p_file_name: fileName || 'manual_import',
                p_total_amount: totalAmount,
                p_entries: entries,
            });

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Algumas transações já foram importadas anteriormente');
                }
                throw error;
            }

            const result = data as { success: boolean; batch_id?: string; count?: number };
            if (!result.success) {
                throw new Error('Falha ao importar lote');
            }

            return { imported: result.count || entries.length, batchId: result.batch_id };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['import-history'] });
            toast.success(`${result.imported} transações importadas com sucesso!`);
        },
        onError: (error: Error) => {
            toast.error(`Erro na importação: ${error.message}`);
        },
    });
}

/**
 * Mutation para conciliação parcial
 */
export function useReconcilePartial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            statementEntryId,
            systemTransactionId,
            amountToReconcile,
            targetBankId,
        }: {
            statementEntryId: string;
            systemTransactionId: string;
            amountToReconcile?: number;
            targetBankId?: string;
        }) => {
            const { data, error } = await (supabase.rpc as any)('reconcile_transaction_partial', {
                p_statement_entry_id: statementEntryId,
                p_system_transaction_id: systemTransactionId,
                p_amount_to_reconcile: amountToReconcile || null,
                p_target_bank_id: targetBankId || null,
            });

            if (error) throw error;

            const result = data as { success: boolean; error?: string };
            if (!result.success) {
                throw new Error(result.error || 'Falha na conciliação parcial');
            }

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['match-suggestions'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-paginated'] });
            toast.success('Conciliação parcial realizada com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro na conciliação parcial: ${error.message}`);
        },
    });
}

/**
 * Mutation para aplicar múltiplas sugestões de match
 */
export function useApplyMatchSuggestions() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (suggestions: MatchSuggestion[]) => {
            let successCount = 0;
            const errors: string[] = [];

            for (const suggestion of suggestions) {
                try {
                    const isPartial = Math.abs(suggestion.statement_amount) !== Math.abs(suggestion.system_amount);

                    if (isPartial) {
                        // Use partial reconciliation RPC
                        const { data, error } = await (supabase.rpc as any)('reconcile_transaction_partial', {
                            p_statement_entry_id: suggestion.statement_entry_id,
                            p_system_transaction_id: suggestion.system_transaction_id,
                            p_amount_to_reconcile: Math.abs(suggestion.statement_amount),
                        });

                        if (error) throw error;

                        const result = data as { success: boolean };
                        if (result.success) {
                            successCount++;
                        }
                    } else {
                        // Use full reconciliation RPC
                        const { data, error } = await (supabase.rpc as any)('reconcile_transactions', {
                            p_statement_entry_id: suggestion.statement_entry_id,
                            p_system_transaction_id: suggestion.system_transaction_id,
                        });

                        if (error) throw error;

                        const result = data as { success: boolean };
                        if (result.success) {
                            successCount++;
                        }
                    }
                } catch (err) {
                    errors.push(`Falha ao conciliar: ${(err as Error).message}`);
                }
            }

            return { successCount, errors };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['match-suggestions'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });

            if (result.successCount > 0) {
                toast.success(`${result.successCount} transações conciliadas automaticamente!`);
            }
            if (result.errors.length > 0) {
                toast.warning(`${result.errors.length} conciliações falharam`);
            }
        },
        onError: (error: Error) => {
            toast.error(`Erro ao aplicar sugestões: ${error.message}`);
        },
    });
}

// ============ BULK RECONCILE ============

export function useBulkReconcile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ transactionIds, bankAccountId }: { transactionIds: string[]; bankAccountId?: string }) => {
            const { data, error } = await (supabase.rpc as any)('bulk_manual_reconcile', {
                p_transaction_ids: transactionIds,
                p_bank_account_id: bankAccountId || null,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-paginated'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-detailed'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['account-balances'] });
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-financial-kpis'] });
            toast.success(`${variables.transactionIds.length} transações conciliadas em massa!`);
        },
        onError: (error: Error) => {
            toast.error(`Erro na conciliação em massa: ${error.message}`);
        },
    });
}

// ============ IMPORT HISTORY ============

export interface ImportHistoryItem {
    id: string;
    bank_account_id: string | null;
    imported_at: string;
    imported_by: string | null;
    total_transactions: number;
    total_amount: number;
    status: string;
    auditor_name: string | null;
    file_name: string | null;
    error_message: string | null;
}

export function useImportHistory(bankAccountId: string | null) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['import-history', user?.id, bankAccountId],
        queryFn: async () => {
            if (!user) return [];

            let query = supabase
                .from('bank_import_history')
                .select('*')
                .order('imported_at', { ascending: false })
                .limit(50);

            if (bankAccountId && bankAccountId !== 'all') {
                query = query.eq('bank_account_id', bankAccountId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as ImportHistoryItem[];
        },
        enabled: !!user,
        staleTime: 30 * 1000,
    });
}

export function useImportBatchEntries(batchId: string | null) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['import-batch-entries', user?.id, batchId],
        queryFn: async () => {
            if (!user || !batchId) return [];

            const { data, error } = await supabase
                .from('bank_statement_entries')
                .select('*')
                .eq('import_batch_id', batchId)
                .order('transaction_date', { ascending: true });

            if (error) throw error;
            return (data || []) as BankStatementEntry[];
        },
        enabled: !!user && !!batchId,
    });
}

// ============ KPIs DE CONCILIAÇÃO (RPC) ============

export interface ReconciliationKpis {
    total_count: number;
    reconciled_count: number;
    pending_count: number;
    ignored_count: number;
    total_amount: number;
    reconciled_amount: number;
    pending_amount: number;
    reconciled_revenue: number;
    reconciled_expense: number;
    pending_revenue: number;
    pending_expense: number;
}

export interface ReconciliationKpisWithComparison {
    current: ReconciliationKpis;
    previous: ReconciliationKpis;
}

function parseKpiRow(row: any): ReconciliationKpis {
    const data = row?.current || row;
    return {
        total_count: Number(data?.total_count) || 0,
        reconciled_count: Number(data?.reconciled_count) || 0,
        pending_count: Number(data?.pending_count) || 0,
        ignored_count: Number(data?.ignored_count) || 0,
        total_amount: Number(data?.total_amount) || 0,
        reconciled_amount: Number(data?.reconciled_amount) || 0,
        pending_amount: Number(data?.pending_amount) || 0,
        reconciled_revenue: Number(data?.reconciled_revenue) || 0,
        reconciled_expense: Number(data?.reconciled_expense) || 0,
        pending_revenue: Number(data?.pending_revenue) || 0,
        pending_expense: Number(data?.pending_expense) || 0,
    };
}

const emptyKpis: ReconciliationKpis = { total_count: 0, reconciled_count: 0, pending_count: 0, ignored_count: 0, total_amount: 0, reconciled_amount: 0, pending_amount: 0, reconciled_revenue: 0, reconciled_expense: 0, pending_revenue: 0, pending_expense: 0 };

export function useReconciliationKpis(
    bankAccountId: string | null,
    startDate?: string,
    endDate?: string,
    searchTerm?: string
) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['reconciliation-kpis', user?.id, bankAccountId, startDate, endDate, searchTerm],
        queryFn: async (): Promise<ReconciliationKpisWithComparison> => {
            if (!user) return { current: emptyKpis, previous: emptyKpis };

            const safeBankId = (!bankAccountId || bankAccountId === 'all') ? null : bankAccountId;

            const { data, error } = await (supabase.rpc as any)('get_reconciliation_kpis', {
                p_bank_account_id: safeBankId,
                p_start_date: startDate || null,
                p_end_date: endDate || null,
                p_search_term: searchTerm || null
            });

            if (error) throw error;

            // RPC returns JSON { current: {...}, previous: {...} }
            const result = data || {};
            const currentData = result.current || result;
            const previousData = result.previous || {};

            return {
                current: {
                    total_count: Number(currentData.total_count) || 0,
                    reconciled_count: Number(currentData.reconciled_count) || 0,
                    pending_count: Number(currentData.pending_count) || 0,
                    ignored_count: Number(currentData.ignored_count) || 0,
                    total_amount: Number(currentData.total_amount) || 0,
                    reconciled_amount: Number(currentData.reconciled_amount) || 0,
                    pending_amount: Number(currentData.pending_amount) || 0,
                    reconciled_revenue: Number(currentData.reconciled_revenue) || 0,
                    reconciled_expense: Number(currentData.reconciled_expense) || 0,
                    pending_revenue: Number(currentData.pending_revenue) || 0,
                    pending_expense: Number(currentData.pending_expense) || 0,
                },
                previous: {
                    total_count: Number(previousData.total_count) || 0,
                    reconciled_count: Number(previousData.reconciled_count) || 0,
                    pending_count: Number(previousData.pending_count) || 0,
                    ignored_count: Number(previousData.ignored_count) || 0,
                    total_amount: Number(previousData.total_amount) || 0,
                    reconciled_amount: Number(previousData.reconciled_amount) || 0,
                    pending_amount: Number(previousData.pending_amount) || 0,
                    reconciled_revenue: Number(previousData.reconciled_revenue) || 0,
                    reconciled_expense: Number(previousData.reconciled_expense) || 0,
                    pending_revenue: Number(previousData.pending_revenue) || 0,
                    pending_expense: Number(previousData.pending_expense) || 0,
                },
            };
        },
        enabled: !!user,
    });
}
