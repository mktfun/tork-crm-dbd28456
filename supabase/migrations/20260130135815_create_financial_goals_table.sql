-- Tabela de metas financeiras mensais
CREATE TABLE IF NOT EXISTS financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  goal_amount DECIMAL(15, 2) NOT NULL CHECK (goal_amount >= 0),
  goal_type TEXT NOT NULL DEFAULT 'revenue' CHECK (goal_type IN ('revenue', 'profit', 'commission')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Garantir apenas uma meta por usuário/ano/mês/tipo
  UNIQUE(user_id, year, month, goal_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_id ON financial_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_goals_year_month ON financial_goals(year, month);
CREATE INDEX IF NOT EXISTS idx_financial_goals_user_year_month ON financial_goals(user_id, year, month);

-- RLS (Row Level Security)
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas suas próprias metas
CREATE POLICY "Users can view own goals"
  ON financial_goals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Usuários podem inserir suas próprias metas
CREATE POLICY "Users can insert own goals"
  ON financial_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem atualizar suas próprias metas
CREATE POLICY "Users can update own goals"
  ON financial_goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários podem deletar suas próprias metas
CREATE POLICY "Users can delete own goals"
  ON financial_goals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_financial_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_financial_goals_updated_at
  BEFORE UPDATE ON financial_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_financial_goals_updated_at();

-- Função para buscar meta do mês atual
CREATE OR REPLACE FUNCTION get_current_month_goal(
  p_user_id UUID,
  p_goal_type TEXT DEFAULT 'revenue'
)
RETURNS TABLE (
  goal_id UUID,
  goal_amount DECIMAL,
  year INTEGER,
  month INTEGER,
  description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fg.id,
    fg.goal_amount,
    fg.year,
    fg.month,
    fg.description
  FROM financial_goals fg
  WHERE fg.user_id = p_user_id
    AND fg.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
    AND fg.month = EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
    AND fg.goal_type = p_goal_type
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar metas de um período
CREATE OR REPLACE FUNCTION get_goals_by_period(
  p_user_id UUID,
  p_start_year INTEGER,
  p_start_month INTEGER,
  p_end_year INTEGER,
  p_end_month INTEGER,
  p_goal_type TEXT DEFAULT 'revenue'
)
RETURNS TABLE (
  goal_id UUID,
  goal_amount DECIMAL,
  year INTEGER,
  month INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fg.id,
    fg.goal_amount,
    fg.year,
    fg.month,
    fg.description,
    fg.created_at
  FROM financial_goals fg
  WHERE fg.user_id = p_user_id
    AND fg.goal_type = p_goal_type
    AND (
      (fg.year > p_start_year) OR
      (fg.year = p_start_year AND fg.month >= p_start_month)
    )
    AND (
      (fg.year < p_end_year) OR
      (fg.year = p_end_year AND fg.month <= p_end_month)
    )
  ORDER BY fg.year ASC, fg.month ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para comparar meta vs realizado
CREATE OR REPLACE FUNCTION get_goal_vs_actual(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER,
  p_goal_type TEXT DEFAULT 'revenue'
)
RETURNS TABLE (
  goal_amount DECIMAL,
  actual_amount DECIMAL,
  difference DECIMAL,
  percentage_achieved DECIMAL,
  status TEXT
) AS $$
DECLARE
  v_goal_amount DECIMAL;
  v_actual_amount DECIMAL;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Buscar meta
  SELECT fg.goal_amount INTO v_goal_amount
  FROM financial_goals fg
  WHERE fg.user_id = p_user_id
    AND fg.year = p_year
    AND fg.month = p_month
    AND fg.goal_type = p_goal_type;
  
  -- Se não houver meta, retornar vazio
  IF v_goal_amount IS NULL THEN
    RETURN;
  END IF;
  
  -- Calcular período
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Buscar faturamento realizado (receitas confirmadas)
  SELECT COALESCE(SUM(fl.amount), 0) INTO v_actual_amount
  FROM financial_transactions ft
  JOIN financial_ledger fl ON fl.transaction_id = ft.id
  JOIN financial_accounts fa ON fa.id = fl.account_id
  WHERE ft.user_id = p_user_id
    AND fa.type = 'income'
    AND ft.status = 'confirmed'
    AND NOT ft.is_void
    AND fl.amount > 0
    AND ft.transaction_date BETWEEN v_start_date AND v_end_date;
  
  -- Retornar comparação
  RETURN QUERY
  SELECT 
    v_goal_amount,
    v_actual_amount,
    (v_actual_amount - v_goal_amount) as diff,
    CASE 
      WHEN v_goal_amount > 0 THEN ROUND((v_actual_amount / v_goal_amount) * 100, 2)
      ELSE 0
    END as pct,
    CASE 
      WHEN v_actual_amount >= v_goal_amount THEN 'achieved'
      WHEN v_actual_amount >= (v_goal_amount * 0.8) THEN 'near'
      ELSE 'below'
    END as goal_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON TABLE financial_goals IS 
'Armazena metas financeiras mensais por usuário.
Suporta diferentes tipos de metas: receita, lucro, comissão.';

COMMENT ON FUNCTION get_current_month_goal IS 
'Retorna a meta do mês atual para o usuário.';

COMMENT ON FUNCTION get_goals_by_period IS 
'Retorna metas de um período específico (ano/mês inicial até ano/mês final).';

COMMENT ON FUNCTION get_goal_vs_actual IS 
'Compara meta vs realizado para um mês específico.
Retorna valor da meta, valor realizado, diferença, percentual e status.';
