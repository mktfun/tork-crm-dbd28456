-- Função MVP para projeção de fluxo de caixa (Saldo Atual + Comissões Futuras)
CREATE OR REPLACE FUNCTION calculate_projected_cash_flow(
    p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
    date DATE,
    projected_balance NUMERIC,
    inflows NUMERIC,
    outflows NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_current_balance NUMERIC;
BEGIN
    -- Recupera o ID do usuário autenticado contextualmente
    v_user_id := auth.uid();
    
    -- 1. Obtém o Saldo Real Atual (Soma do Ledger consolidado até HOJE)
    SELECT COALESCE(SUM(fl.amount), 0)
    INTO v_current_balance
    FROM financial_ledger fl
    JOIN financial_accounts fa ON fl.account_id = fa.id
    WHERE fa.user_id = v_user_id
      AND fa.status = 'active';

    RETURN QUERY
    WITH 
    -- 2. Entradas Futuras (Baseadas apenas em Comissões de Apólices Ativas)
    future_commissions AS (
        SELECT
            a.expiration_date::DATE as txn_date,
            SUM(
                COALESCE(a.premium_value, 0) * (COALESCE(a.commission_rate, 0) / 100.0)
            ) as daily_inflow
        FROM apolices a
        WHERE a.user_id = v_user_id
          AND a.status = 'Ativa'
          AND a.expiration_date > CURRENT_DATE
          AND a.expiration_date <= (CURRENT_DATE + p_days)
        GROUP BY a.expiration_date::DATE
    ),
    
    -- 3. Série de Datas (Garante continuidade do gráfico)
    date_series AS (
        SELECT generate_series(
            CURRENT_DATE + 1,
            CURRENT_DATE + p_days,
            '1 day'::interval
        )::DATE as day_date
    )
    -- 4. Consolidação Final
    SELECT
        ds.day_date as date,
        (
            v_current_balance + 
            SUM(COALESCE(fc.daily_inflow, 0)) OVER (ORDER BY ds.day_date)
        )::NUMERIC(15,2) as projected_balance,
        COALESCE(fc.daily_inflow, 0)::NUMERIC(15,2) as inflows,
        0::NUMERIC(15,2) as outflows
    FROM date_series ds
    LEFT JOIN future_commissions fc ON ds.day_date = fc.txn_date
    ORDER BY ds.day_date;
END;
$$;

COMMENT ON FUNCTION calculate_projected_cash_flow IS 'MVP: Projeta saldo somando Ledger Atual + Comissões Futuras de Apólices.';