

# Plano: Corrigir Prompt de Triagem + Sistema Autônomo de Follow-ups

## Parte 1 — Bug no prompt (rápido)

**Problema**: Linha 832 do dispatcher ainda injeta `"PRECISA CRIAR CADASTRO com create_contact"` no contexto do cliente não cadastrado, mesmo após a remoção das tools.

**Correção**: Reescrever o bloco `clientContextForPrompt` para clientes sem cadastro, removendo referência a tools.

## Parte 2 — Sistema Autônomo de Follow-ups (feature nova)

### Conceito

O dispatcher ganha "consciência temporal": quando envia uma mensagem com link/cotação/proposta, registra um follow-up pendente. Um cron job verifica periodicamente se o cliente respondeu. Se não, dispara mensagem de lembrete via Chatwoot. Após 3 tentativas sem resposta, desativa a IA e deixa a negociação parada.

### Arquitetura

```text
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Dispatcher   │────▶│ ai_follow_ups   │◀────│  Cron Job        │
│  (cria entry) │     │ (tabela)        │     │  (check-followups│
└──────────────┘     └─────────────────┘     │   edge function) │
                                              └────────┬─────────┘
                                                       │
                                              ┌────────▼─────────┐
                                              │  Chatwoot API    │
                                              │  (envia msg)     │
                                              └──────────────────┘
```

### 1. Nova tabela: `ai_follow_ups`

```sql
create table public.ai_follow_ups (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references crm_deals(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  chatwoot_conversation_id bigint not null,
  brokerage_id bigint references brokerages(id),
  trigger_reason text not null,          -- 'link_sent', 'proposal_sent', 'waiting_response'
  follow_up_message text,                -- mensagem personalizada do lembrete
  attempt_count int default 0,
  max_attempts int default 3,
  next_check_at timestamptz not null,    -- quando verificar
  interval_minutes int default 60,       -- intervalo entre tentativas
  status text default 'pending',         -- 'pending', 'responded', 'exhausted', 'cancelled'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ai_follow_ups enable row level security;
create index idx_follow_ups_pending on ai_follow_ups(status, next_check_at) where status = 'pending';
```

### 2. Nova Edge Function: `check-followups`

Executada via `pg_cron` a cada 5 minutos. Fluxo:
1. Busca `ai_follow_ups` onde `status = 'pending'` e `next_check_at <= now()`
2. Para cada entry, checa no Chatwoot se houve mensagem incoming após o `created_at`
3. **Se respondeu** → marca `status = 'responded'`, segue fluxo normal
4. **Se não respondeu**:
   - Se `attempt_count < max_attempts`: envia mensagem via Chatwoot API, incrementa `attempt_count`, atualiza `next_check_at += interval_minutes`
   - Se `attempt_count >= max_attempts`: marca `status = 'exhausted'`, desativa IA no cliente (`clientes.ai_enabled = false`), loga evento no deal

### 3. Alteração no Dispatcher

No dispatcher, após enviar ao n8n, adicionar lógica de detecção de "gatilho de espera":
- A IA (via n8n) pode retornar um campo `follow_up_needed: true` no response
- Ou o dispatcher pode inferir: se a mensagem do agente contém link, proposta, ou pergunta direta → criar follow-up

Abordagem mais simples: **o n8n insere o follow-up** via API do Supabase quando a resposta da IA contém indicação de espera. Assim não precisamos mudar o dispatcher agora.

Abordagem integrada: o dispatcher cria o follow-up baseado em heurísticas (presença de URL na resposta, palavras-chave como "proposta", "cotação", "link").

### 4. Mensagens de follow-up (templates)

```
Tentativa 1: "Oi {nome}! Vi que mandei umas informações mais cedo, conseguiu dar uma olhada?"
Tentativa 2: "Opa {nome}, tudo certo? Fico à disposição se tiver alguma dúvida sobre o que enviei!"
Tentativa 3: "Fala {nome}! Vou dar uma pausa aqui, mas qualquer coisa é só chamar que retomo na hora 👋"
```

### 5. pg_cron setup

```sql
select cron.schedule(
  'check-ai-followups',
  '*/5 * * * *',
  $$ select net.http_post(
    url:='https://jaouwhckqqnaxqyfvgyq.supabase.co/functions/v1/check-followups',
    headers:='{"Authorization": "Bearer ANON_KEY", "Content-Type": "application/json"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id; $$
);
```

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/chatwoot-dispatcher/index.ts` | Corrigir `clientContextForPrompt` (remover ref a tools) |
| Nova migration | Criar tabela `ai_follow_ups` |
| `supabase/functions/check-followups/index.ts` | Nova edge function para cron |
| `supabase/config.toml` | Registrar `check-followups` |
| SQL (pg_cron) | Agendar execução a cada 5 min |

## Complexidade

Não é "muito complexo" — é modular. A tabela + cron + edge function são padrões já usados no projeto. O mais delicado é a integração com Chatwoot para enviar mensagens de follow-up e checar se houve resposta, mas já temos esse padrão no dispatcher.

