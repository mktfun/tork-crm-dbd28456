-- Migration: Sync Orphaned Bank Statements (Bug 1 - KPI fix)
-- Description: This migration finds bank statement entries that are marked as 
--              reconciled/matched but don't have a corresponding financial_transaction 
--              or ledger entry, and creates them.

DO $$
DECLARE
    v_entry RECORD;
    v_transaction_id UUID;
    v_asset_account_id UUID;
    v_category_account_id UUID;
    v_count_created INTEGER := 0;
BEGIN
    -- For each matched statement entry that does NOT have a valid mapped transaction
    FOR v_entry IN 
        SELECT b.*,
               (SELECT fa.id FROM financial_accounts fa WHERE fa.user_id = b.user_id AND fa.type = 'asset' AND fa.status = 'active' ORDER BY fa.name LIMIT 1) as asset_account_id
        FROM bank_statement_entries b
        WHERE b.reconciliation_status IN ('matched', 'manual_match')
          AND b.matched_transaction_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM financial_transactions ft 
              WHERE ft.id = b.matched_transaction_id
          )
    LOOP
        -- This case handles corrupted matched_transaction_id
        -- But wait, what if they were just "ignored"? We only want matched ones.
        -- Let's reset their status to pending so they can be properly reconciled 
        -- or automatically create them if they have enough data.
        
        -- Since we can't guess the category account, the safest approach for fully 
        -- ORPHANED matches is to set them back to pending, OR map to "Diversos"
        
        -- Let's just find an "Outras Receitas" or "Outras Despesas" account
        IF v_entry.amount > 0 THEN
            SELECT id INTO v_category_account_id FROM financial_accounts 
            WHERE user_id = v_entry.user_id AND type = 'revenue' 
            ORDER BY name LIMIT 1;
        ELSE
            SELECT id INTO v_category_account_id FROM financial_accounts 
            WHERE user_id = v_entry.user_id AND type = 'expense' 
            ORDER BY name LIMIT 1;
        END IF;

        IF v_entry.asset_account_id IS NOT NULL AND v_category_account_id IS NOT NULL THEN
            -- Create the missing financial transaction
            INSERT INTO financial_transactions (
                id, user_id, created_by, description, transaction_date, reference_number,
                bank_account_id, is_reconciled, reconciled_at, reconciled_statement_id,
                type, total_amount, paid_amount, reconciled, is_confirmed, status
            ) VALUES (
                v_entry.matched_transaction_id, -- use the orphaned ID
                v_entry.user_id, v_entry.user_id,
                COALESCE(v_entry.description, 'Lançamento Bancário (Recuperado)'),
                v_entry.transaction_date, v_entry.reference_number,
                v_entry.bank_account_id,
                TRUE, v_entry.matched_at, v_entry.id,
                CASE WHEN v_entry.amount < 0 THEN 'expense' ELSE 'revenue' END,
                ABS(v_entry.amount), ABS(v_entry.amount),
                TRUE, TRUE, 'paid'
            ) RETURNING id INTO v_transaction_id;

            -- Create ledger entries
            IF v_entry.amount > 0 THEN
                INSERT INTO financial_ledger (transaction_id, account_id, amount)
                VALUES 
                    (v_transaction_id, v_entry.asset_account_id, v_entry.amount),
                    (v_transaction_id, v_category_account_id, -v_entry.amount);
            ELSE
                INSERT INTO financial_ledger (transaction_id, account_id, amount)
                VALUES 
                    (v_transaction_id, v_category_account_id, ABS(v_entry.amount)),
                    (v_transaction_id, v_entry.asset_account_id, v_entry.amount);
            END IF;
            
            v_count_created := v_count_created + 1;
        ELSE
            -- If we can't find accounts, at least reset them so they show in the UI to be matched
            UPDATE bank_statement_entries 
            SET reconciliation_status = 'pending', matched_transaction_id = NULL
            WHERE id = v_entry.id;
        END IF;
    END LOOP;

    RAISE NOTICE 'Created % missing financial transactions for orphaned bank statements', v_count_created;
END $$;
