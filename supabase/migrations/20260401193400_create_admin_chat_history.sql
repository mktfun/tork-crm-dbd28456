-- Migration: Create admin_chat_history for WhatsApp admin conversation persistence
CREATE TABLE IF NOT EXISTS admin_chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by user + phone + recency
CREATE INDEX IF NOT EXISTS idx_admin_chat_history_lookup
  ON admin_chat_history(user_id, phone_number, created_at DESC);

-- RLS
ALTER TABLE admin_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on admin_chat_history"
  ON admin_chat_history
  FOR ALL
  USING (true)
  WITH CHECK (true);
