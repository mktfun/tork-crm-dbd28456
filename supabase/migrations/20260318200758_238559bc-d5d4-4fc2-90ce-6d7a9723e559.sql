
CREATE TABLE public.ai_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  chatwoot_conversation_id BIGINT NOT NULL,
  brokerage_id BIGINT REFERENCES public.brokerages(id),
  trigger_reason TEXT NOT NULL,
  follow_up_message TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  next_check_at TIMESTAMPTZ NOT NULL,
  interval_minutes INT NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_follow_ups_pending ON public.ai_follow_ups(status, next_check_at) WHERE status = 'pending';
CREATE INDEX idx_follow_ups_user_id ON public.ai_follow_ups(user_id);
CREATE INDEX idx_follow_ups_deal_id ON public.ai_follow_ups(deal_id);

CREATE POLICY "Users can view own follow ups" ON public.ai_follow_ups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own follow ups" ON public.ai_follow_ups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own follow ups" ON public.ai_follow_ups FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own follow ups" ON public.ai_follow_ups FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access" ON public.ai_follow_ups FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_ai_follow_ups_updated_at BEFORE UPDATE ON public.ai_follow_ups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
