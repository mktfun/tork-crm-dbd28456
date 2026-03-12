
-- Step 2: Update all RPCs to filter archived=false + fix DRE view

-- 2a. get_financial_summary
CREATE OR REPLACE FUNCTION public.get_financial_summary(p_start_date date, p_end_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID; v_current_income NUMERIC := 0; v_current_expense NUMERIC := 0;
  v_current_pending_income NUMERIC := 0; v_current_pending_expense NUMERIC := 0;
  v_current_op_pending_income NUMERIC := 0; v_prev_income NUMERIC := 0; v_prev_expense NUMERIC := 0;
  v_prev_pending_income NUMERIC := 0; v_prev_pending_expense NUMERIC := 0;
  v_period_days INTEGER; v_prev_start_date DATE; v_prev_end_date DATE;
  v_cash_balance NUMERIC := 0; v_global_pending_income NUMERIC := 0; v_global_pending_expense NUMERIC := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'User not authenticated'; END IF;
  v_period_days := p_end_date - p_start_date;
  v_prev_end_date := p_start_date - 1;
  v_prev_start_date := v_prev_end_date - v_period_days;

  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_current_income, v_current_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND t.transaction_date BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.status,'pending')!='ignored' AND COALESCE(t.reconciled,false)=true;

  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_current_pending_income, v_current_pending_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.due_date,t.transaction_date) BETWEEN p_start_date AND p_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored');

  SELECT COALESCE(SUM(t.total_amount),0) INTO v_current_op_pending_income FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored')
    AND t.transaction_date<=(CURRENT_DATE+30) AND t.type IN ('revenue','income','Entrada');

  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_prev_income, v_prev_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND t.transaction_date BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.status,'pending')!='ignored' AND COALESCE(t.reconciled,false)=true;

  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_prev_pending_income, v_prev_pending_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.due_date,t.transaction_date) BETWEEN v_prev_start_date AND v_prev_end_date
    AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored');

  SELECT COALESCE(SUM(CASE WHEN t.type IN ('revenue','income','Entrada') THEN t.total_amount ELSE 0 END),0),
         COALESCE(SUM(CASE WHEN t.type IN ('expense','despesa','Saída') THEN t.total_amount ELSE 0 END),0)
  INTO v_global_pending_income, v_global_pending_expense FROM financial_transactions t
  WHERE t.user_id=v_user_id AND COALESCE(t.is_void,false)=false AND COALESCE(t.archived,false)=false
    AND COALESCE(t.reconciled,false)=false AND COALESCE(t.status,'pending') NOT IN ('confirmed','ignored')
    AND t.type IN ('revenue','expense','income','Entrada','Saída');

  SELECT COALESCE(SUM(current_balance),0) INTO v_cash_balance FROM bank_accounts WHERE user_id=v_user_id AND is_active=true;

  RETURN JSON_BUILD_OBJECT(
    'current', JSON_BUILD_OBJECT('totalIncome',v_current_income,'totalExpense',v_current_expense,
      'netResult',v_current_income-v_current_expense,'pendingIncome',v_current_pending_income,
      'pendingExpense',v_current_pending_expense,'operationalPendingIncome',v_current_op_pending_income,
      'globalPendingIncome',v_global_pending_income,'globalPendingExpense',v_global_pending_expense,'cashBalance',v_cash_balance),
    'previous', JSON_BUILD_OBJECT('totalIncome',v_prev_income,'totalExpense',v_prev_expense,
      'netResult',v_prev_income-v_prev_expense,'pendingIncome',v_prev_pending_income,
      'pendingExpense',v_prev_pending_expense,'start_date',v_prev_start_date,'end_date',v_prev_end_date));
END;$function$;

-- 2b. get_reconciliation_kpis
CREATE OR REPLACE FUNCTION public.get_reconciliation_kpis(p_bank_account_id text, p_start_date date, p_end_date date, p_search_term text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
    v_bank_uuid UUID; v_user_id UUID := auth.uid();
    v_period_days INTEGER; v_prev_start DATE; v_prev_end DATE;
    v_cur_total_count INTEGER; v_cur_pending_count INTEGER; v_cur_reconciled_count INTEGER; v_cur_ignored_count INTEGER;
    v_cur_reconciled_revenue NUMERIC; v_cur_reconciled_expense NUMERIC; v_cur_pending_revenue NUMERIC; v_cur_pending_expense NUMERIC;
    v_prev_total_count INTEGER; v_prev_pending_count INTEGER; v_prev_reconciled_count INTEGER; v_prev_ignored_count INTEGER;
    v_prev_reconciled_revenue NUMERIC; v_prev_reconciled_expense NUMERIC; v_prev_pending_revenue NUMERIC; v_prev_pending_expense NUMERIC;
    v_unlinked_count INTEGER; v_unlinked_pending INTEGER; v_unlinked_reconciled INTEGER; v_unlinked_amount NUMERIC;
BEGIN
    IF p_bank_account_id IS NOT NULL AND p_bank_account_id<>'' AND p_bank_account_id<>'all' THEN v_bank_uuid:=p_bank_account_id::uuid; END IF;
    v_period_days:=p_end_date-p_start_date+1; v_prev_end:=p_start_date-1; v_prev_start:=v_prev_end-v_period_days+1;

    SELECT COUNT(*),COALESCE(SUM(CASE WHEN(t.reconciled=FALSE OR t.reconciled IS NULL)THEN 1 ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN t.reconciled=TRUE THEN 1 ELSE 0 END),0),0,
      COALESCE(SUM(CASE WHEN t.reconciled=TRUE AND t.type IN('revenue','income','Entrada')THEN COALESCE(t.total_amount,0)ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN t.reconciled=TRUE AND t.type IN('expense','despesa','Saída')THEN COALESCE(t.total_amount,0)ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN(t.reconciled=FALSE OR t.reconciled IS NULL)AND t.type IN('revenue','income','Entrada')THEN COALESCE(t.total_amount,0)ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN(t.reconciled=FALSE OR t.reconciled IS NULL)AND t.type IN('expense','despesa','Saída')THEN COALESCE(t.total_amount,0)ELSE 0 END),0)
    INTO v_cur_total_count,v_cur_pending_count,v_cur_reconciled_count,v_cur_ignored_count,
         v_cur_reconciled_revenue,v_cur_reconciled_expense,v_cur_pending_revenue,v_cur_pending_expense
    FROM financial_transactions t WHERE t.user_id=v_user_id AND NOT COALESCE(t.is_void,false) AND COALESCE(t.archived,false)=false
      AND t.transaction_date BETWEEN p_start_date AND p_end_date
      AND(v_bank_uuid IS NOT NULL AND t.bank_account_id=v_bank_uuid OR v_bank_uuid IS NULL AND t.bank_account_id IS NOT NULL)
      AND(p_search_term IS NULL OR t.description ILIKE '%'||p_search_term||'%');

    SELECT COUNT(*),COALESCE(SUM(CASE WHEN(t.reconciled=FALSE OR t.reconciled IS NULL)THEN 1 ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN t.reconciled=TRUE THEN 1 ELSE 0 END),0),0,
      COALESCE(SUM(CASE WHEN t.reconciled=TRUE AND t.type IN('revenue','income','Entrada')THEN COALESCE(t.total_amount,0)ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN t.reconciled=TRUE AND t.type IN('expense','despesa','Saída')THEN COALESCE(t.total_amount,0)ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN(t.reconciled=FALSE OR t.reconciled IS NULL)AND t.type IN('revenue','income','Entrada')THEN COALESCE(t.total_amount,0)ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN(t.reconciled=FALSE OR t.reconciled IS NULL)AND t.type IN('expense','despesa','Saída')THEN COALESCE(t.total_amount,0)ELSE 0 END),0)
    INTO v_prev_total_count,v_prev_pending_count,v_prev_reconciled_count,v_prev_ignored_count,
         v_prev_reconciled_revenue,v_prev_reconciled_expense,v_prev_pending_revenue,v_prev_pending_expense
    FROM financial_transactions t WHERE t.user_id=v_user_id AND NOT COALESCE(t.is_void,false) AND COALESCE(t.archived,false)=false
      AND t.transaction_date BETWEEN v_prev_start AND v_prev_end
      AND(v_bank_uuid IS NOT NULL AND t.bank_account_id=v_bank_uuid OR v_bank_uuid IS NULL AND t.bank_account_id IS NOT NULL)
      AND(p_search_term IS NULL OR t.description ILIKE '%'||p_search_term||'%');

    IF v_bank_uuid IS NULL THEN
      SELECT COUNT(*),COALESCE(SUM(CASE WHEN(t.reconciled=FALSE OR t.reconciled IS NULL)THEN 1 ELSE 0 END),0),
        COALESCE(SUM(CASE WHEN t.reconciled=TRUE THEN 1 ELSE 0 END),0),COALESCE(SUM(COALESCE(t.total_amount,0)),0)
      INTO v_unlinked_count,v_unlinked_pending,v_unlinked_reconciled,v_unlinked_amount
      FROM financial_transactions t WHERE t.user_id=v_user_id AND NOT COALESCE(t.is_void,false) AND COALESCE(t.archived,false)=false
        AND t.transaction_date BETWEEN p_start_date AND p_end_date AND t.bank_account_id IS NULL
        AND(p_search_term IS NULL OR t.description ILIKE '%'||p_search_term||'%');
    ELSE v_unlinked_count:=0;v_unlinked_pending:=0;v_unlinked_reconciled:=0;v_unlinked_amount:=0; END IF;

    RETURN json_build_object(
      'current',json_build_object('total_count',v_cur_total_count,'pending_count',v_cur_pending_count,'reconciled_count',v_cur_reconciled_count,'ignored_count',v_cur_ignored_count,
        'total_amount',(v_cur_reconciled_revenue+v_cur_pending_revenue)-(v_cur_reconciled_expense+v_cur_pending_expense),
        'reconciled_amount',v_cur_reconciled_revenue-v_cur_reconciled_expense,'pending_amount',v_cur_pending_revenue-v_cur_pending_expense,
        'reconciled_revenue',v_cur_reconciled_revenue,'reconciled_expense',v_cur_reconciled_expense,'pending_revenue',v_cur_pending_revenue,'pending_expense',v_cur_pending_expense,
        'net_pending',v_cur_pending_revenue-v_cur_pending_expense,'net_reconciled',v_cur_reconciled_revenue-v_cur_reconciled_expense),
      'previous',json_build_object('total_count',v_prev_total_count,'pending_count',v_prev_pending_count,'reconciled_count',v_prev_reconciled_count,'ignored_count',v_prev_ignored_count,
        'total_amount',(v_prev_reconciled_revenue+v_prev_pending_revenue)-(v_prev_reconciled_expense+v_prev_pending_expense),
        'reconciled_amount',v_prev_reconciled_revenue-v_prev_reconciled_expense,'pending_amount',v_prev_pending_revenue-v_prev_pending_expense,
        'reconciled_revenue',v_prev_reconciled_revenue,'reconciled_expense',v_prev_reconciled_expense,'pending_revenue',v_prev_pending_revenue,'pending_expense',v_prev_pending_expense,
        'net_pending',v_prev_pending_revenue-v_prev_pending_expense,'net_reconciled',v_prev_reconciled_revenue-v_prev_reconciled_expense),
      'unlinked',json_build_object('total_count',v_unlinked_count,'pending_count',v_unlinked_pending,'reconciled_count',v_unlinked_reconciled,'total_amount',v_unlinked_amount));
END;$function$;

-- 2c. get_bank_statement_paginated  
CREATE OR REPLACE FUNCTION public.get_bank_statement_paginated(p_bank_account_id text,p_start_date date,p_end_date date,
    p_page integer DEFAULT 1,p_page_size integer DEFAULT 20,p_search_term text DEFAULT NULL,p_status text DEFAULT 'todas',p_type text DEFAULT 'todos')
RETURNS TABLE(id uuid,transaction_date date,bank_name text,type text,description text,category_name text,amount numeric,
    running_balance numeric,status_display text,reconciled boolean,bank_account_id uuid,total_count bigint,reconciled_by_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_offset INTEGER; v_bank_uuid UUID; v_user_id UUID:=auth.uid();
BEGIN
    v_offset:=(p_page-1)*p_page_size;
    IF p_bank_account_id IS NOT NULL AND p_bank_account_id<>'' AND p_bank_account_id<>'all' THEN v_bank_uuid:=p_bank_account_id::uuid; END IF;
    RETURN QUERY
    WITH all_movements AS (
        SELECT t.id,t.transaction_date AS tx_date,COALESCE(ba.bank_name,'Sem banco') AS bank_nm,t.type,t.description,
            COALESCE((SELECT string_agg(fa.name,', ') FROM financial_ledger fl JOIN financial_accounts fa ON fl.account_id=fa.id WHERE fl.transaction_id=t.id),'Sem categoria') AS cat_name,
            COALESCE(t.total_amount,0) AS amount,
            CASE WHEN t.type IN ('revenue','receita','Entrada') THEN COALESCE(t.total_amount,0) ELSE -COALESCE(t.total_amount,0) END AS impact,
            CASE WHEN t.reconciled=TRUE THEN 'Conciliado' WHEN t.status='confirmed' THEN 'Pendente' ELSE COALESCE(t.status,'Pendente') END AS status_disp,
            t.reconciled,t.bank_account_id AS tx_bank_account_id,t.created_at,COUNT(*) OVER() AS full_count,p.nome_completo as reconciled_by_nm
        FROM financial_transactions t LEFT JOIN bank_accounts ba ON t.bank_account_id=ba.id
        LEFT JOIN bank_statement_entries bse ON t.reconciled_statement_id=bse.id LEFT JOIN profiles p ON bse.matched_by=p.id
        WHERE t.user_id=v_user_id
          AND(v_bank_uuid IS NOT NULL AND t.bank_account_id=v_bank_uuid OR v_bank_uuid IS NULL AND t.bank_account_id IS NOT NULL)
          AND t.transaction_date BETWEEN p_start_date AND p_end_date AND NOT COALESCE(t.is_void,false) AND COALESCE(t.archived,false)=false
          AND(p_search_term IS NULL OR t.description ILIKE '%'||p_search_term||'%' OR EXISTS(SELECT 1 FROM financial_ledger fl JOIN financial_accounts fa ON fl.account_id=fa.id WHERE fl.transaction_id=t.id AND fa.name ILIKE '%'||p_search_term||'%'))
          AND(p_type='todos' OR(p_type='receita' AND t.type IN('revenue','receita','Entrada')) OR(p_type='despesa' AND t.type IN('expense','despesa','Saída')))
          AND(p_status='todas' OR(p_status='conciliado' AND t.reconciled=TRUE) OR(p_status='pendente' AND(t.reconciled=FALSE OR t.reconciled IS NULL)))
        ORDER BY t.transaction_date ASC,t.created_at ASC),
    with_balance AS (SELECT *,SUM(impact) OVER(ORDER BY tx_date ASC,created_at ASC) AS running_bal FROM all_movements)
    SELECT wb.id,wb.tx_date,wb.bank_nm,wb.type,wb.description,wb.cat_name,wb.amount,wb.running_bal,wb.status_disp,wb.reconciled,wb.tx_bank_account_id,wb.full_count,wb.reconciled_by_nm
    FROM with_balance wb ORDER BY wb.tx_date DESC,wb.created_at DESC LIMIT p_page_size OFFSET v_offset;
END;$function$;

-- 2d. get_cash_flow_data
CREATE OR REPLACE FUNCTION public.get_cash_flow_data(p_start_date date,p_end_date date,p_granularity text DEFAULT 'day')
RETURNS TABLE(period text,income numeric,expense numeric,balance numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user_id uuid;
BEGIN
  v_user_id:=auth.uid();
  RETURN QUERY
  WITH periods AS (SELECT CASE p_granularity WHEN 'month' THEN TO_CHAR(d,'YYYY-MM') ELSE TO_CHAR(d,'YYYY-MM-DD') END AS period_key
    FROM generate_series(p_start_date::timestamp,p_end_date::timestamp,CASE p_granularity WHEN 'month' THEN '1 month'::interval ELSE '1 day'::interval END) d),
  tx_data AS (SELECT CASE p_granularity WHEN 'month' THEN TO_CHAR(ft.transaction_date,'YYYY-MM') ELSE TO_CHAR(ft.transaction_date,'YYYY-MM-DD') END AS period_key,
    ft.type AS tx_type,ft.total_amount FROM financial_transactions ft
    WHERE ft.user_id=v_user_id AND ft.transaction_date BETWEEN p_start_date AND p_end_date
      AND NOT COALESCE(ft.is_void,false) AND COALESCE(ft.archived,false)=false AND COALESCE(ft.reconciled,false)=true AND COALESCE(ft.status,'pending')!='ignored'),
  aggregated AS (SELECT period_key,COALESCE(SUM(CASE WHEN tx_type IN('revenue','income','Entrada')THEN total_amount ELSE 0 END),0) as income,
    COALESCE(SUM(CASE WHEN tx_type IN('expense','despesa','Saída')THEN total_amount ELSE 0 END),0) as expense FROM tx_data GROUP BY period_key)
  SELECT p.period_key,COALESCE(a.income,0),COALESCE(a.expense,0),COALESCE(a.income,0)-COALESCE(a.expense,0) FROM periods p LEFT JOIN aggregated a ON a.period_key=p.period_key ORDER BY p.period_key;
END;$function$;

-- 2e. get_revenue_by_dimension
CREATE OR REPLACE FUNCTION public.get_revenue_by_dimension(p_user_id uuid,p_start_date date,p_end_date date,p_dimension text)
RETURNS TABLE(dimension_name text,total_amount numeric,transaction_count integer,percentage numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH revenue_transactions AS (
    SELECT ft.total_amount AS tx_amount,ft.producer_id,ft.ramo_id,ft.insurance_company_id,
      a.producer_id AS policy_producer_id,a.type AS policy_type,a.insurance_company AS policy_company,a.ramo_id AS policy_ramo_id
    FROM financial_transactions ft LEFT JOIN apolices a ON a.id=ft.related_entity_id AND ft.related_entity_type='policy'
    WHERE ft.user_id=p_user_id AND ft.type IN('revenue','income','Entrada') AND COALESCE(ft.reconciled,false)=true
      AND NOT COALESCE(ft.is_void,false) AND COALESCE(ft.archived,false)=false AND COALESCE(ft.status,'pending')!='ignored'
      AND ft.transaction_date BETWEEN p_start_date AND p_end_date),
  dimension_data AS (SELECT rt.tx_amount,CASE
    WHEN p_dimension='producer' THEN COALESCE((SELECT p.nome_completo FROM profiles p WHERE p.id=COALESCE(rt.producer_id,rt.policy_producer_id)),'Sem Produtor')
    WHEN p_dimension='type' THEN COALESCE((SELECT r.nome FROM ramos r WHERE r.id=COALESCE(rt.ramo_id,rt.policy_ramo_id)),rt.policy_type,'Sem Ramo')
    WHEN p_dimension='insurance_company' THEN COALESCE((SELECT c.name FROM companies c WHERE c.id=COALESCE(rt.insurance_company_id,rt.policy_company)),'Sem Seguradora')
    ELSE 'Desconhecido' END AS dim_name FROM revenue_transactions rt),
  grouped_totals AS (SELECT COALESCE(dim_name,'Não Classificado') AS d_name,COALESCE(SUM(tx_amount),0) AS t_amount,COUNT(*)::INTEGER AS t_count FROM dimension_data GROUP BY dim_name),
  grand_total AS (SELECT COALESCE(SUM(t_amount),0) AS gt FROM grouped_totals)
  SELECT gt.d_name::TEXT,gt.t_amount,gt.t_count,CASE WHEN g.gt>0 THEN ROUND((gt.t_amount/g.gt)*100,2) ELSE 0::DECIMAL END
  FROM grouped_totals gt CROSS JOIN grand_total g WHERE gt.t_amount>0 ORDER BY gt.t_amount DESC LIMIT 10;
END;$function$;

-- 2f. get_transactions_for_reconciliation
DROP FUNCTION IF EXISTS get_transactions_for_reconciliation(uuid,boolean);
CREATE OR REPLACE FUNCTION public.get_transactions_for_reconciliation(p_bank_account_id uuid,p_include_unassigned boolean DEFAULT false)
RETURNS TABLE(id uuid,transaction_date date,description text,amount numeric,type text,status text,total_amount numeric,paid_amount numeric,remaining_amount numeric,customer_name text,insurer_name text,branch_name text,item_name text,bank_account_id uuid,related_entity_type text)
LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY SELECT DISTINCT ON(ft.id) ft.id,ft.transaction_date,ft.description,
        (ft.total_amount-COALESCE(ft.paid_amount,0)),COALESCE(ft.type,fa.type::TEXT),ft.status,ft.total_amount,COALESCE(ft.paid_amount,0),
        (ft.total_amount-COALESCE(ft.paid_amount,0)),c.name,comp.name,r.nome,p.insured_asset,ft.bank_account_id,ft.related_entity_type
    FROM financial_transactions ft JOIN financial_ledger fl ON ft.id=fl.transaction_id JOIN financial_accounts fa ON fl.account_id=fa.id
    LEFT JOIN apolices p ON ft.related_entity_id::text=p.id::text AND ft.related_entity_type='policy'
    LEFT JOIN clientes c ON p.client_id=c.id LEFT JOIN companies comp ON p.insurance_company=comp.id LEFT JOIN ramos r ON p.ramo_id=r.id
    WHERE(fa.type='expense' OR fa.type='revenue') AND COALESCE(ft.is_void,false)=false AND COALESCE(ft.archived,false)=false
      AND(ft.reconciled=false OR ft.reconciled IS NULL) AND ft.total_amount>COALESCE(ft.paid_amount,0)
      AND((p_bank_account_id IS NULL) OR(ft.bank_account_id=p_bank_account_id OR(p_include_unassigned=TRUE AND ft.bank_account_id IS NULL)))
    ORDER BY ft.id,ft.transaction_date DESC;
END;$function$;

-- 2g. Update DRE view
DROP VIEW IF EXISTS financial_dre_view CASCADE;
CREATE VIEW financial_dre_view AS
SELECT ft.user_id,TO_CHAR(ft.transaction_date,'YYYY-MM') AS period,
  EXTRACT(YEAR FROM ft.transaction_date)::integer AS year,EXTRACT(MONTH FROM ft.transaction_date)::integer AS month,
  fa.name AS category,fa.type AS account_type,
  CASE WHEN fa.type='revenue' THEN ABS(SUM(fl.amount)) WHEN fa.type='expense' THEN ABS(SUM(fl.amount)) ELSE SUM(fl.amount) END AS total_amount
FROM financial_ledger fl JOIN financial_transactions ft ON fl.transaction_id=ft.id JOIN financial_accounts fa ON fl.account_id=fa.id
WHERE fa.type IN('revenue','expense') AND(ft.is_void IS NULL OR ft.is_void=false) AND COALESCE(ft.archived,false)=false
GROUP BY ft.user_id,TO_CHAR(ft.transaction_date,'YYYY-MM'),EXTRACT(YEAR FROM ft.transaction_date),EXTRACT(MONTH FROM ft.transaction_date),fa.name,fa.type
ORDER BY period DESC,account_type,category;

-- Recreate dependent functions
CREATE OR REPLACE FUNCTION get_user_dre_data() RETURNS SETOF financial_dre_view LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$ SELECT * FROM financial_dre_view WHERE user_id=auth.uid(); $$;

CREATE OR REPLACE FUNCTION get_dre_data(p_year integer DEFAULT NULL)
RETURNS TABLE(category text,account_type text,jan numeric,fev numeric,mar numeric,abr numeric,mai numeric,jun numeric,jul numeric,ago numeric,"set" numeric,"out" numeric,nov numeric,dez numeric,total numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public
AS $$
DECLARE v_year integer;
BEGIN
  v_year:=COALESCE(p_year,EXTRACT(YEAR FROM NOW())::integer);
  RETURN QUERY
  WITH monthly_data AS (SELECT dv.category,dv.account_type::text,dv.month,dv.total_amount FROM financial_dre_view dv WHERE dv.user_id=auth.uid() AND dv.year=v_year),
  pivoted AS (SELECT md.category,md.account_type,
    COALESCE(SUM(CASE WHEN md.month=1 THEN md.total_amount END),0) AS jan,COALESCE(SUM(CASE WHEN md.month=2 THEN md.total_amount END),0) AS fev,
    COALESCE(SUM(CASE WHEN md.month=3 THEN md.total_amount END),0) AS mar,COALESCE(SUM(CASE WHEN md.month=4 THEN md.total_amount END),0) AS abr,
    COALESCE(SUM(CASE WHEN md.month=5 THEN md.total_amount END),0) AS mai,COALESCE(SUM(CASE WHEN md.month=6 THEN md.total_amount END),0) AS jun,
    COALESCE(SUM(CASE WHEN md.month=7 THEN md.total_amount END),0) AS jul,COALESCE(SUM(CASE WHEN md.month=8 THEN md.total_amount END),0) AS ago,
    COALESCE(SUM(CASE WHEN md.month=9 THEN md.total_amount END),0) AS "set",COALESCE(SUM(CASE WHEN md.month=10 THEN md.total_amount END),0) AS "out",
    COALESCE(SUM(CASE WHEN md.month=11 THEN md.total_amount END),0) AS nov,COALESCE(SUM(CASE WHEN md.month=12 THEN md.total_amount END),0) AS dez
    FROM monthly_data md GROUP BY md.category,md.account_type)
  SELECT p.category,p.account_type,p.jan,p.fev,p.mar,p.abr,p.mai,p.jun,p.jul,p.ago,p."set",p."out",p.nov,p.dez,
    (p.jan+p.fev+p.mar+p.abr+p.mai+p.jun+p.jul+p.ago+p."set"+p."out"+p.nov+p.dez) AS total
  FROM pivoted p ORDER BY p.account_type DESC,p.category;
END;$$;
