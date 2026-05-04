-- 1. crm_proposals
create table crm_proposals (
  id            uuid primary key default gen_random_uuid(),
  deal_id       uuid not null references crm_deals(id) on delete cascade,
  user_id       uuid not null references auth.users(id),
  token         text unique not null,           -- nanoid 12 chars, URL pública
  title         text not null,
  client_name   text,
  client_phone  text,
  client_vehicle text,                           -- ex: "HB20 2022 Prata"
  ramo          text default 'auto',
  valid_until   date,
  status        text default 'draft',            -- draft|sent|accepted|rejected|expired
  accepted_option_id uuid,                       -- qual opção foi aceita
  accepted_stage_id  uuid,                       -- stage destino se aceitar
  rejected_stage_id  uuid,                       -- stage destino se recusar
  enable_comparison  boolean default false,      -- ativar comparativo de apólice anterior
  total_views   int default 0,
  total_time_seconds int default 0,
  warmth        text default 'cold',             -- cold|warm|hot
  sent_at       timestamptz,
  accepted_at   timestamptz,
  created_at    timestamptz default now()
);

-- RLS
alter table crm_proposals enable row level security;
create policy "Users can view their own proposals" on crm_proposals for select using (user_id = auth.uid());
create policy "Users can insert their own proposals" on crm_proposals for insert with check (user_id = auth.uid());
create policy "Users can update their own proposals" on crm_proposals for update using (user_id = auth.uid());
create policy "Users can delete their own proposals" on crm_proposals for delete using (user_id = auth.uid());


-- 2. crm_proposal_options
create table crm_proposal_options (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references crm_proposals(id) on delete cascade,
  insurer_name    text not null,                 -- "Porto Seguro"
  plan_name       text not null,                 -- "Intermediário"
  price_monthly   numeric(10,2),
  price_annual    numeric(10,2),
  deductible      text,                          -- "R$ 2.000"
  coverage_items  text[],                        -- lista de coberturas
  payment_terms   text,                          -- "50% entrada + 50% entrega"
  is_recommended  boolean default false,
  sort_order      int default 0
);

-- RLS
alter table crm_proposal_options enable row level security;
create policy "Users can manage options of their proposals" on crm_proposal_options
  using (
    exists (
      select 1 from crm_proposals p 
      where p.id = crm_proposal_options.proposal_id 
      and p.user_id = auth.uid()
    )
  );


-- 3. crm_proposal_events
create table crm_proposal_events (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid not null references crm_proposals(id) on delete cascade,
  event_type    text not null,  -- view_started|view_ended|option_selected|accepted|rejected|reminder
  metadata      jsonb,          -- { option_id, duration_seconds, device }
  ip_hash       text,
  created_at    timestamptz default now()
);

-- RLS
alter table crm_proposal_events enable row level security;
create policy "Users can view events of their proposals" on crm_proposal_events for select
  using (
    exists (
      select 1 from crm_proposals p 
      where p.id = crm_proposal_events.proposal_id 
      and p.user_id = auth.uid()
    )
  );
-- Nota: O INSERT de events será feito via RPC (security definer) porque a página é pública.


-- 4. RPCs

-- 4.1 get_proposal_by_token (Public access)
create or replace function public.get_proposal_by_token(p_token text)
returns jsonb
language plpgsql security definer
as $$
declare
  v_proposal record;
  v_options jsonb;
  v_result jsonb;
begin
  select * into v_proposal from crm_proposals where token = p_token limit 1;
  
  if not found then
    return null;
  end if;

  select coalesce(jsonb_agg(row_to_json(o)), '[]'::jsonb)
  into v_options
  from (
    select * from crm_proposal_options 
    where proposal_id = v_proposal.id 
    order by sort_order
  ) o;

  v_result := jsonb_build_object(
    'proposal', row_to_json(v_proposal),
    'options', v_options
  );

  return v_result;
end;
$$;


-- 4.2 record_proposal_event (Public access)
create or replace function public.record_proposal_event(
  p_token text,
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer
as $$
declare
  v_proposal_id uuid;
begin
  select id into v_proposal_id from crm_proposals where token = p_token limit 1;
  
  if found then
    insert into crm_proposal_events (proposal_id, event_type, metadata)
    values (v_proposal_id, p_event_type, p_metadata);

    -- Atualiza métricas na proposta (ex: total_views)
    if p_event_type = 'view_started' then
      update crm_proposals set total_views = total_views + 1 where id = v_proposal_id;
    end if;
    
    if p_event_type = 'view_ended' and p_metadata ? 'duration_seconds' then
      update crm_proposals set total_time_seconds = total_time_seconds + (p_metadata->>'duration_seconds')::int where id = v_proposal_id;
    end if;
  end if;
end;
$$;


-- 4.3 accept_proposal (Public access)
create or replace function public.accept_proposal(
  p_token text,
  p_option_id uuid
)
returns void
language plpgsql security definer
as $$
declare
  v_proposal record;
begin
  select * into v_proposal from crm_proposals where token = p_token limit 1;
  
  if found and v_proposal.status != 'accepted' then
    -- Atualiza a proposta
    update crm_proposals 
    set status = 'accepted',
        accepted_option_id = p_option_id,
        accepted_at = now()
    where id = v_proposal.id;

    -- Registra o evento
    insert into crm_proposal_events (proposal_id, event_type, metadata)
    values (v_proposal.id, 'accepted', jsonb_build_object('option_id', p_option_id));

    -- Move o deal se tiver stage configurado
    if v_proposal.accepted_stage_id is not null then
      update crm_deals 
      set stage_id = v_proposal.accepted_stage_id,
          updated_at = now()
      where id = v_proposal.deal_id;
    end if;
  end if;
end;
$$;
