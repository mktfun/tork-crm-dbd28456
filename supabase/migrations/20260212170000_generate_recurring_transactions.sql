-- Função para gerar transações recorrentes pendentes
CREATE OR REPLACE FUNCTION generate_recurring_transactions()
RETURNS INTEGER AS $$
DECLARE
  r RECORD;
  v_count INTEGER := 0;
  v_next_date DATE;
  v_payable_account_id UUID;
  v_receivable_account_id UUID;
  v_movements JSONB;
  v_user_id UUID;
BEGIN
  -- Percorrer todas as configurações ativas que ainda não venceram (ou end_date > hoje)
  FOR r IN 
    SELECT * FROM financial_recurring_configs 
    WHERE is_active = true 
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    v_user_id := r.user_id;

    -- 1. Buscar contas padrão para contrapartida
    -- Para DESPESA: Contrapartida em PASSIVO (Contas a Pagar)
    IF r.nature = 'expense' THEN
      SELECT id INTO v_payable_account_id 
      FROM financial_accounts 
      WHERE user_id = v_user_id AND type = 'liability' AND name ILIKE '%pagar%' 
      LIMIT 1;
      
      -- Fallback para qualquer passivo
      IF v_payable_account_id IS NULL THEN
        SELECT id INTO v_payable_account_id 
        FROM financial_accounts 
        WHERE user_id = v_user_id AND type = 'liability' 
        LIMIT 1;
      END IF;

      IF v_payable_account_id IS NULL THEN
        CONTINUE; -- Não há conta de passivo
      END IF;

      -- Montar movimentos: Débito na Despesa (conta da config), Crédito no Passivo (v_payable)
      -- Importante: create_financial_movement usa a convenção de sinais do Ledger
      -- Despesa: Valor positivo (aumenta despesa)
      -- Passivo: Valor negativo (aumenta passivo)
      v_movements := jsonb_build_array(
        jsonb_build_object('account_id', r.account_id, 'amount', r.amount),
        jsonb_build_object('account_id', v_payable_account_id, 'amount', -r.amount)
      );
    
    -- Para RECEITA: Contrapartida em ATIVO (Contas a Receber)
    ELSIF r.nature = 'revenue' THEN
      SELECT id INTO v_receivable_account_id 
      FROM financial_accounts 
      WHERE user_id = v_user_id AND type = 'asset' AND name ILIKE '%receber%' 
      LIMIT 1;
      
      -- Fallback
      IF v_receivable_account_id IS NULL THEN
        SELECT id INTO v_receivable_account_id 
        FROM financial_accounts 
        WHERE user_id = v_user_id AND type = 'asset' 
        LIMIT 1;
      END IF;

      IF v_receivable_account_id IS NULL THEN
        CONTINUE; -- Não há conta de ativo
      END IF;

      -- Montar movimentos: Crédito na Receita (conta da config, negativo), Débito no Ativo (positivo)
      v_movements := jsonb_build_array(
        jsonb_build_object('account_id', r.account_id, 'amount', -r.amount),
        jsonb_build_object('account_id', v_receivable_account_id, 'amount', r.amount)
      );
    ELSE
      CONTINUE;
    END IF;

    -- 2. Loop para gerar transações atrasadas (catch-up)
    LOOP
      -- Calcular próxima data
      IF r.last_generated_date IS NULL THEN
        v_next_date := r.start_date;
      ELSE
        IF r.frequency = 'monthly' THEN
          v_next_date := r.last_generated_date + INTERVAL '1 month';
        ELSIF r.frequency = 'weekly' THEN
          v_next_date := r.last_generated_date + INTERVAL '1 week';
        ELSE
          v_next_date := r.last_generated_date + INTERVAL '1 month'; -- Default
        END IF;
      END IF;

      -- Critério de Parada:
      -- 1. Se próxima data for no futuro (> hoje)
      -- 2. Se próxima data passou do end_date (se houver)
      IF v_next_date > CURRENT_DATE OR (r.end_date IS NOT NULL AND v_next_date > r.end_date) THEN
        EXIT;
      END IF;

      -- Gerar Transação
      PERFORM create_financial_movement(
        r.description,
        v_next_date,
        v_movements,
        NULL, -- Reference Number
        'recurring_config', -- Related Entity Type
        r.id, -- Related Entity ID (Linkar com a config)
        NULL, -- Sem banco (usa contrapartida)
        false -- Pendente
      );

      -- Atualizar Config
      UPDATE financial_recurring_configs 
      SET last_generated_date = v_next_date,
          updated_at = NOW()
      WHERE id = r.id;

      -- Atualizar variável local para próxima iteração
      r.last_generated_date := v_next_date;
      v_count := v_count + 1;
      
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agendamento via pg_cron (Comentado pois depende da extensão estar ativa)
-- SELECT cron.schedule('generate-recurring', '0 6 * * *', 'SELECT generate_recurring_transactions()');
