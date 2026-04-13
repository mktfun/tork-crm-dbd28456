const { Client } = require('pg');

const client = new Client({
    host: 'db.jaouwhckqqnaxqyfvgyq.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Mktfunil8563*',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
});

async function run() {
    let timeoutId = setTimeout(() => {
        console.log('Timeout reached. Query taking too long.');
        process.exit(1);
    }, 15000);

    try {
        await client.connect();
        console.log("=== DROP ===");
        await client.query("DROP FUNCTION IF EXISTS public.get_cash_flow_data(date, date, text);");
        
        console.log("=== CREATE ===");
        const sql = `
CREATE OR REPLACE FUNCTION public.get_cash_flow_data(
    p_start_date date,
    p_end_date date,
    p_granularity text DEFAULT 'day'::text
)
RETURNS TABLE (
    period text,
    income numeric,
    expense numeric,
    balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $func$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  WITH periods AS (
    SELECT 
      CASE p_granularity 
        WHEN 'month' THEN TO_CHAR(d, 'YYYY-MM') 
        ELSE TO_CHAR(d, 'YYYY-MM-DD') 
      END AS t_period
    FROM generate_series(
      p_start_date::timestamp, 
      p_end_date::timestamp, 
      CASE p_granularity WHEN 'month' THEN '1 month'::interval ELSE '1 day'::interval END
    ) d
  ),
  tx_data AS (
    SELECT 
      CASE p_granularity 
        WHEN 'month' THEN TO_CHAR(ft.transaction_date, 'YYYY-MM') 
        ELSE TO_CHAR(ft.transaction_date, 'YYYY-MM-DD') 
      END AS t_period,
      ft.type AS tx_type,
      ft.total_amount 
    FROM financial_transactions ft
    WHERE ft.user_id = v_user_id 
      AND ft.transaction_date BETWEEN p_start_date AND p_end_date
      AND NOT COALESCE(ft.is_void, false) 
      AND COALESCE(ft.archived, false) = false 
      AND COALESCE(ft.reconciled, false) = true 
      AND COALESCE(ft.status, 'pending') != 'ignored'
  ),
  aggregated AS (
    SELECT 
      t_period,
      COALESCE(SUM(CASE WHEN tx_type IN ('revenue','income','Entrada') THEN total_amount ELSE 0 END), 0) as inc_sum,
      COALESCE(SUM(CASE WHEN tx_type IN ('expense','despesa','Saída') THEN total_amount ELSE 0 END), 0) as exp_sum 
    FROM tx_data 
    GROUP BY t_period
  )
  SELECT 
    p.t_period::text AS period,
    COALESCE(a.inc_sum, 0)::numeric AS income,
    COALESCE(a.exp_sum, 0)::numeric AS expense,
    (COALESCE(a.inc_sum, 0) - COALESCE(a.exp_sum, 0))::numeric AS balance 
  FROM periods p 
  LEFT JOIN aggregated a ON a.t_period = p.t_period 
  ORDER BY p.t_period;
END;
$func$;
        `;
        await client.query(sql);
        console.log("=== DONE ===");
        
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        clearTimeout(timeoutId);
        await client.end();
        process.exit(0);
    }
}
run();
