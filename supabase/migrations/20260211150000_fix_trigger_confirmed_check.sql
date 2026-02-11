-- =====================================================================
-- 🐞 FIX: Bank Balance Trigger should only update if IS_CONFIRMED = true
-- Timestamp: 20260211150000
-- =====================================================================

CREATE OR REPLACE FUNCTION public.update_bank_balance_immediately()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_impact NUMERIC;
    v_old_impact NUMERIC;
BEGIN
    -- === INSERT ===
    IF TG_OP = 'INSERT' THEN
        -- Only update balance if bank_account_id is set AND transaction is NOT void AND IS CONFIRMED
        IF NEW.bank_account_id IS NOT NULL 
           AND NOT COALESCE(NEW.is_void, false) 
           AND COALESCE(NEW.is_confirmed, false) THEN
           
            v_impact := CASE 
                WHEN NEW.type IN ('revenue', 'receita', 'Entrada') THEN ABS(COALESCE(NEW.total_amount, 0)) 
                WHEN NEW.type IN ('expense', 'despesa', 'Saída') THEN -ABS(COALESCE(NEW.total_amount, 0))
                ELSE 0 
            END;
            
            IF v_impact <> 0 THEN
                UPDATE bank_accounts SET current_balance = current_balance + v_impact WHERE id = NEW.bank_account_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    -- === UPDATE ===
    IF TG_OP = 'UPDATE' THEN

        -- Calculate "Effective Amount" for OLD and NEW states.
        -- Effective Amount = Signed amount if (bank_id set AND !void AND confirmed), else 0.
        
        v_old_impact := 0;
        IF OLD.bank_account_id IS NOT NULL AND NOT COALESCE(OLD.is_void, false) AND COALESCE(OLD.is_confirmed, false) THEN
            v_old_impact := CASE 
                WHEN OLD.type IN ('revenue', 'receita', 'Entrada') THEN ABS(COALESCE(OLD.total_amount, 0))
                WHEN OLD.type IN ('expense', 'despesa', 'Saída') THEN -ABS(COALESCE(OLD.total_amount, 0))
                ELSE 0 
            END;
        END IF;

        v_impact := 0; -- New impact
        IF NEW.bank_account_id IS NOT NULL AND NOT COALESCE(NEW.is_void, false) AND COALESCE(NEW.is_confirmed, false) THEN
            v_impact := CASE 
                WHEN NEW.type IN ('revenue', 'receita', 'Entrada') THEN ABS(COALESCE(NEW.total_amount, 0))
                WHEN NEW.type IN ('expense', 'despesa', 'Saída') THEN -ABS(COALESCE(NEW.total_amount, 0))
                ELSE 0 
            END;
        END IF;

        -- If nothing changed in effectiveness or amount/account, do nothing.
        IF v_old_impact = v_impact AND OLD.bank_account_id = NEW.bank_account_id THEN
            RETURN NEW;
        END IF;

        -- Scenario A: Bank Account did NOT change
        IF OLD.bank_account_id = NEW.bank_account_id THEN
            IF v_old_impact <> v_impact THEN
                 UPDATE bank_accounts 
                 SET current_balance = current_balance + (v_impact - v_old_impact)
                 WHERE id = NEW.bank_account_id;
            END IF;
        
        -- Scenario B: Bank Account changed (or one is null)
        ELSE
            -- Revert old impact from OLD bank account
            IF v_old_impact <> 0 AND OLD.bank_account_id IS NOT NULL THEN
                UPDATE bank_accounts 
                SET current_balance = current_balance - v_old_impact 
                WHERE id = OLD.bank_account_id;
            END IF;

            -- Apply new impact to NEW bank account
            IF v_impact <> 0 AND NEW.bank_account_id IS NOT NULL THEN
                UPDATE bank_accounts 
                SET current_balance = current_balance + v_impact 
                WHERE id = NEW.bank_account_id;
            END IF;
        END IF;

    END IF;

    RETURN NEW;
END;
$$;
