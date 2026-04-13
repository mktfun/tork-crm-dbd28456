-- Create tables for AI Configuration
create table if not exists public.crm_ai_config (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    model text null default 'gpt-4o',
    temperature numeric null default 0.7,
    is_active boolean null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint crm_ai_config_pkey primary key (id),
    constraint crm_ai_config_user_id_key unique (user_id)
);

create table if not exists public.crm_ai_prompts (
    id uuid not null default gen_random_uuid(),
    config_id uuid not null references public.crm_ai_config(id) on delete cascade,
    module_type text not null, -- 'identity', 'rules', 'tools', 'knowledge_base'
    content text not null,
    is_enabled boolean null default true,
    position integer null default 0,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint crm_ai_prompts_pkey primary key (id)
);

-- Indexes
create index if not exists idx_crm_ai_prompts_config_id on public.crm_ai_prompts (config_id);

-- RLS Policies
alter table public.crm_ai_config enable row level security;
alter table public.crm_ai_prompts enable row level security;

create policy "Users can view their own ai config" 
on public.crm_ai_config for select 
using (auth.uid() = user_id);

create policy "Users can update their own ai config" 
on public.crm_ai_config for update 
using (auth.uid() = user_id);

create policy "Users can insert their own ai config" 
on public.crm_ai_config for insert 
with check (auth.uid() = user_id);

create policy "Users can view their own prompts via config" 
on public.crm_ai_prompts for select 
using (
    exists (
        select 1 from public.crm_ai_config
        where crm_ai_config.id = crm_ai_prompts.config_id
        and crm_ai_config.user_id = auth.uid()
    )
);

create policy "Users can manage their own prompts via config" 
on public.crm_ai_prompts for all
using (
    exists (
        select 1 from public.crm_ai_config
        where crm_ai_config.id = crm_ai_prompts.config_id
        and crm_ai_config.user_id = auth.uid()
    )
);
