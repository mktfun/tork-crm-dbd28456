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
    type: 'revenue' | 'expense' | 'receita' | 'despesa'; // Allow both for now
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
    endDate?: string
) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['pending-reconciliation', user?.id, bankAccountId, startDate, endDate],
        queryFn: async () => {
            if (!user || !bankAccountId) return { statement: [], system: [] };

            // 1. Buscar transações do sistema (RPC nova)
            const systemPromise = (supabase.rpc as any)('get_transactions_for_reconciliation', {
                p_bank_account_id: bankAccountId
            });

            // 2. Buscar entradas do extrato (Tabela direta)
            let statementQuery = supabase
                .from('bank_statement_entries')
                .select('*')
                .eq('bank_account_id', bankAccountId)
                .eq('reconciliation_status', 'pending');

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
            // Mapear Sistema (nomes simplificados)
            const systemItems: PendingReconciliationItem[] = (systemResult.data || []).map((item: any) => ({
                source: 'system',
                id: item.id,
                transaction_date: item.transaction_date,
                description: item.description,
                amount: item.amount,
                reference_number: null,
                status: 'pending', // Status visual na lista
                matched_id: null,
                type: item.type || (item.amount < 0 ? 'expense' : 'revenue') // Fallback if type missing
            }));

            // Mapear Extrato
            const statementItems: PendingReconciliationItem[] = (statementResult.data || []).map((item: any) => ({
                source: 'statement',
                id: item.id,
                transaction_date: item.transaction_date,
                description: item.description,
                amount: item.amount,
                reference_number: item.reference_number,
                status: item.reconciliation_status,
                matched_id: item.matched_transaction_id
            }));

            return {
                statement: statementItems,
                system: systemItems,
            };
        },
        enabled: !!user && !!bankAccountId,
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
        mutationFn: async (systemTransactionId: string) => {
            // Usa o nome exato do parâmetro SQL: p_transaction_id
            const { data, error } = await (supabase.rpc as any)('manual_reconcile_transaction', {
                p_transaction_id: systemTransactionId,
            });

            if (error) throw error;

            return { success: true };
        },
        onSuccess: () => {
            // Invalida a lista de conciliação e outras dependentes
            queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['transactions-reconciliation'] });

            // Invalidações adicionais para garantir consistência total na UI
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-financial-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['account-balances'] });

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
            // Invalida tudo para garantir consistência
            queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-financial-kpis'] });
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['account-balances'] });

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
        }: {
            bankAccountId: string;
            entries: Array<{
                transaction_date: string;
                description: string;
                amount: number;
                reference_number?: string;
            }>;
        }) => {
            if (!user) throw new Error('Usuário não autenticado');

            const entriesToInsert = entries.map(entry => ({
                user_id: user.id,
                bank_account_id: bankAccountId,
                transaction_date: entry.transaction_date,
                description: entry.description,
                amount: entry.amount,
                reference_number: entry.reference_number || null,
                reconciliation_status: 'pending',
                import_batch_id: crypto.randomUUID(),
            }));

            const { data, error } = await (supabase as any)
                .from('bank_statement_entries' as any)
                .insert(entriesToInsert)
                .select();

            if (error) {
                // Verificar se é erro de duplicata
                if (error.code === '23505') {
                    throw new Error('Algumas transações já foram importadas anteriormente');
                }
                throw error;
            }

            return { imported: data?.length || 0 };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['bank-statement-entries'] });
            queryClient.invalidateQueries({ queryKey: ['pending-reconciliation'] });
            queryClient.invalidateQueries({ queryKey: ['reconciliation-dashboard'] });
            toast.success(`${result.imported} transações importadas com sucesso!`);
        },
        onError: (error: Error) => {
            toast.error(`Erro na importação: ${error.message}`);
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
                    const { data, error } = await (supabase.rpc as any)('reconcile_transactions', {
                        p_statement_entry_id: suggestion.statement_entry_id,
                        p_system_transaction_id: suggestion.system_transaction_id,
                    });

                    if (error) throw error;

                    const result = data as { success: boolean };
                    if (result.success) {
                        successCount++;
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
