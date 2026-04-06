-- ============================================================
-- Admin Test Sessions: toggle /teste ativa o modo cliente-SDR
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_test_sessions (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brokerage_id integer NOT NULL,
  phone       text NOT NULL,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','feedback_pending')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_test_phone ON admin_test_sessions(phone, status);

-- ============================================================
-- AI Feedbacks: RAG dinâmico para SDR e Mentor
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_feedbacks (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  brokerage_id  integer NOT NULL,
  type          text NOT NULL CHECK (type IN ('sdr','mentor')),
  feedback_text text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_feedbacks_brok_type ON ai_feedbacks(brokerage_id, type);

-- RLS
ALTER TABLE admin_test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedbacks ENABLE ROW LEVEL SECURITY;

-- Service role tem acesso total (Edge Functions usam service_role)
CREATE POLICY "service_role_all" ON admin_test_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON ai_feedbacks FOR ALL USING (true) WITH CHECK (true);
