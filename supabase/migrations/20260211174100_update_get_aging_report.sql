CREATE OR REPLACE FUNCTION public.get_aging_report(
    p_user_id UUID,
    p_type TEXT DEFAULT 'receivables' -- Adiciona o novo parâmetro com um valor padrão
)
RETURNS TABLE(
    bucket_range TEXT,
    bucket_sort_order INT,
    bucket_color TEXT,
    bucket_count BIGINT,
    bucket_amount NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_nature TEXT;
BEGIN
    -- Define a natureza da transação com base no parâmetro de tipo
    IF p_type = 'receivables' THEN
        v_nature := 'RECEITA';
    ELSE
        v_nature := 'DESPESA';
    END IF;

    RETURN QUERY
    WITH aging_buckets AS (
        SELECT
            t.id,
            t.amount,
            (CURRENT_DATE - t.due_date) AS days_overdue
        FROM
            transactions t
        WHERE
            t.user_id = p_user_id
            AND t.status = 'ATRASADO'
            AND t.nature = v_nature -- Filtra pela natureza definida
    ),
    buckets AS (
        SELECT
            CASE
                WHEN days_overdue BETWEEN 1 AND 30 THEN '1-30 dias'
                WHEN days_overdue BETWEEN 31 AND 60 THEN '31-60 dias'
                WHEN days_overdue BETWEEN 61 AND 90 THEN '61-90 dias'
                ELSE '90+ dias'
            END AS bucket_range,
            amount
        FROM
            aging_buckets
    ),
    report AS (
        SELECT
            b.bucket_range,
            SUM(b.amount) AS bucket_amount,
            COUNT(b.amount) AS bucket_count
        FROM
            buckets b
        GROUP BY
            b.bucket_range
    )
    SELECT
        r.bucket_range,
        CASE
            WHEN r.bucket_range = '1-30 dias' THEN 1
            WHEN r.bucket_range = '31-60 dias' THEN 2
            WHEN r.bucket_range = '61-90 dias' THEN 3
            ELSE 4
        END AS bucket_sort_order,
        CASE
            WHEN r.bucket_range = '1-30 dias' THEN '#FBBF24' -- amber-400
            WHEN r.bucket_range = '31-60 dias' THEN '#F59E0B' -- amber-500
            WHEN r.bucket_range = '61-90 dias' THEN '#D97706' -- amber-600
            ELSE '#B45309' -- amber-700
        END AS bucket_color,
        r.bucket_count,
        r.bucket_amount
    FROM
        report r
    ORDER BY
        bucket_sort_order;
END;
$$;
