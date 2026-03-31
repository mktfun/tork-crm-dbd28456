-- Migration: Update get_dre_data (Bug 2 - DRE filter fix)
-- Description: Allow get_dre_data to filter strictly by date boundaries, rather than 
--              relying purely on year selection via the financial_dre_view.

CREATE OR REPLACE FUNCTION public.get_dre_data(
    p_year integer DEFAULT NULL,
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL
)
RETURNS TABLE (
    category text,
    account_type text,
    jan numeric,
    fev numeric,
    mar numeric,
    abr numeric,
    mai numeric,
    jun numeric,
    jul numeric,
    ago numeric,
    "set" numeric,
    "out" numeric,
    nov numeric,
    dez numeric,
    total numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_year integer;
BEGIN
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::integer);
    
    RETURN QUERY
    WITH filtered_data AS (
        -- Realizamos o somatório contornando a view para ter controle absoluto das datas
        SELECT 
            fa.name AS category,
            fa.type AS account_type,
            EXTRACT(MONTH FROM ft.transaction_date)::integer AS month,
            CASE 
                WHEN fa.type='revenue' THEN ABS(SUM(fl.amount)) 
                WHEN fa.type='expense' THEN ABS(SUM(fl.amount)) 
                ELSE SUM(fl.amount) 
            END AS total_amount
        FROM financial_ledger fl 
        JOIN financial_transactions ft ON fl.transaction_id = ft.id 
        JOIN financial_accounts fa ON fl.account_id = fa.id
        WHERE fa.type IN('revenue','expense') 
          AND (ft.is_void IS NULL OR ft.is_void = false) 
          AND COALESCE(ft.archived, false) = false
          AND ft.user_id = auth.uid()
          -- Use start and end date if available
          AND (p_start_date IS NULL OR ft.transaction_date >= p_start_date)
          AND (p_end_date IS NULL OR ft.transaction_date <= p_end_date)
          -- Always respect year boundary so the table columns match
          AND EXTRACT(YEAR FROM ft.transaction_date)::integer = v_year
        GROUP BY 
            fa.name, fa.type, EXTRACT(MONTH FROM ft.transaction_date)
    ),
    pivoted AS (
        SELECT md.category, md.account_type::text,
            COALESCE(SUM(CASE WHEN md.month=1 THEN md.total_amount END), 0) AS jan,
            COALESCE(SUM(CASE WHEN md.month=2 THEN md.total_amount END), 0) AS fev,
            COALESCE(SUM(CASE WHEN md.month=3 THEN md.total_amount END), 0) AS mar,
            COALESCE(SUM(CASE WHEN md.month=4 THEN md.total_amount END), 0) AS abr,
            COALESCE(SUM(CASE WHEN md.month=5 THEN md.total_amount END), 0) AS mai,
            COALESCE(SUM(CASE WHEN md.month=6 THEN md.total_amount END), 0) AS jun,
            COALESCE(SUM(CASE WHEN md.month=7 THEN md.total_amount END), 0) AS jul,
            COALESCE(SUM(CASE WHEN md.month=8 THEN md.total_amount END), 0) AS ago,
            COALESCE(SUM(CASE WHEN md.month=9 THEN md.total_amount END), 0) AS "set",
            COALESCE(SUM(CASE WHEN md.month=10 THEN md.total_amount END), 0) AS "out",
            COALESCE(SUM(CASE WHEN md.month=11 THEN md.total_amount END), 0) AS nov,
            COALESCE(SUM(CASE WHEN md.month=12 THEN md.total_amount END), 0) AS dez
        FROM filtered_data md 
        GROUP BY md.category, md.account_type
    )
    SELECT p.category, p.account_type, p.jan, p.fev, p.mar, p.abr, p.mai, p.jun, p.jul, p.ago, p."set", p."out", p.nov, p.dez,
      (p.jan + p.fev + p.mar + p.abr + p.mai + p.jun + p.jul + p.ago + p."set" + p."out" + p.nov + p.dez) AS total
    FROM pivoted p 
    ORDER BY p.account_type DESC, p.category;
END;
$$;
