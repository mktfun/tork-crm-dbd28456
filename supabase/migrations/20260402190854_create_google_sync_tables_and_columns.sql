-- Create the google_sync_tokens table to store OAuth credentials
CREATE TABLE public.google_sync_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  calendar_sync_token TEXT,  -- syncToken incremental do Google Calendar
  task_list_id TEXT DEFAULT '@default',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_sync_tokens ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own google sync tokens"
  ON public.google_sync_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own google sync tokens"
  ON public.google_sync_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own google sync tokens"
  ON public.google_sync_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own google sync tokens"
  ON public.google_sync_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Add google sync columns to appointments
ALTER TABLE public.appointments ADD COLUMN google_event_id TEXT;
ALTER TABLE public.appointments ADD COLUMN google_synced_at TIMESTAMPTZ;

-- Add google sync columns to tasks
ALTER TABLE public.tasks ADD COLUMN google_task_id TEXT;
ALTER TABLE public.tasks ADD COLUMN google_synced_at TIMESTAMPTZ;
