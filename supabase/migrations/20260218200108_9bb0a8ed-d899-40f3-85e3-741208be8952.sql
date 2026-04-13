
-- Table to cache daily AI-generated strategic summaries
CREATE TABLE public.ai_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT 'day',
  focus TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  summary_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one summary per user/scope/focus/date
CREATE UNIQUE INDEX idx_ai_summaries_unique 
  ON public.ai_summaries (user_id, scope, focus, summary_date);

-- Index for fast lookups
CREATE INDEX idx_ai_summaries_lookup 
  ON public.ai_summaries (user_id, summary_date);

-- Enable RLS
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries"
  ON public.ai_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries"
  ON public.ai_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
  ON public.ai_summaries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own summaries"
  ON public.ai_summaries FOR DELETE
  USING (auth.uid() = user_id);
