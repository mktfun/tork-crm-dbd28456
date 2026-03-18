
alter table public.crm_ai_settings 
  add column if not exists follow_up_enabled boolean default false,
  add column if not exists follow_up_interval_minutes int default 60,
  add column if not exists follow_up_max_attempts int default 3,
  add column if not exists follow_up_message text;
