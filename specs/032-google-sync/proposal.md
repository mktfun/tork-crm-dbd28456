# Proposal 032: Integração Google Calendar + Google Tasks

## Contexto
O Tork CRM possui dois módulos internos de produtividade — **Agendamentos** (`appointments`) e **Tarefas** (`tasks`) — que hoje vivem isolados no Supabase. O corretor precisa abrir o CRM para ver seus compromissos. A integração com o Google Calendar e Google Tasks permitirá sincronização bidirecional, trazendo os agendamentos do CRM para o celular do corretor e vice-versa.

## Requisitos e User Stories

### US01 — Conectar conta Google
> Como corretor, quero conectar minha conta Google nas configurações para que meus agendamentos e tarefas sincronizem automaticamente.

### US02 — Sync Agendamentos → Google Calendar
> Como corretor, quero que ao criar/editar/concluir um agendamento no CRM, ele apareça/atualize/desapareça automaticamente no meu Google Calendar.

### US03 — Sync Google Calendar → Agendamentos
> Como corretor, quero que eventos criados no Google Calendar apareçam automaticamente no CRM (sync reverso).

### US04 — Sync Tarefas → Google Tasks
> Como corretor, quero que minhas tarefas do CRM apareçam na minha lista de tarefas do Google Tasks, com data e status sincronizados.

### US05 — Sync Google Tasks → Tarefas CRM
> Como corretor, quero que ao concluir uma tarefa no Google Tasks, ela seja marcada como concluída no CRM.

---

## O que JÁ EXISTE e será REUTILIZADO

| Componente | Arquivo | Papel |
|---|---|---|
| **Hook de Agendamentos** | `src/hooks/useSupabaseAppointments.ts` | CRUD completo em `appointments` |
| **Hook de Tarefas** | `src/hooks/useSupabaseTasks.ts` | CRUD completo em `tasks` |
| **Página Agendamentos** | `src/pages/Appointments.tsx` | FullCalendar + Lista |
| **Página Tarefas** | `src/pages/Tasks.tsx` | Tabela com paginação |
| **Supabase Auth** | Já configurado | OAuth provider base |
| **Tabela `appointments`** | Supabase | Agendamentos com `date`, `time`, `status`, `client_id`, `policy_id` |
| **Tabela `tasks`** | Supabase | Tarefas com `due_date`, `status`, `priority`, `task_type` |
| **Settings page** | `src/pages/settings/` | Já existe estrutura de configurações |
| **Edge Functions** | `supabase/functions/` | Infraestrutura para criar novas functions |

## O que precisa ser CRIADO

### 1. Google Cloud Setup (Manual/Config)
- Projeto no Google Cloud Console
- Habilitar Google Calendar API + Google Tasks API
- Criar credenciais OAuth 2.0 (Client ID + Client Secret)
- Configurar redirect URI apontando para o Supabase (`/auth/v1/callback`)

### 2. Backend (Supabase)

#### Tabela `google_sync_tokens` [NOVA]
```sql
CREATE TABLE google_sync_tokens (
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
```

#### Colunas novas em tabelas existentes
- `appointments.google_event_id TEXT` — ID do evento no Google Calendar
- `appointments.google_synced_at TIMESTAMPTZ` — Última sincronização
- `tasks.google_task_id TEXT` — ID da tarefa no Google Tasks
- `tasks.google_synced_at TIMESTAMPTZ` — Última sincronização

#### Edge Function `google-calendar-sync` [NOVA]
- Recebe `{ userId, direction: 'push' | 'pull' | 'full' }`
- **Push:** Busca appointments sem `google_event_id` → cria no Google Calendar → salva o `google_event_id`
- **Pull:** Usa `syncToken` incremental → busca mudanças no Google → cria/atualiza no Supabase
- Assinatura JWT com Service Account ou Access Token do usuário

#### Edge Function `google-tasks-sync` [NOVA]
- Mesma lógica de Push/Pull para a tabela `tasks`

#### Edge Function `google-auth-callback` [NOVA]
- Recebe o código OAuth do Google após consentimento
- Troca por `access_token` + `refresh_token`
- Salva em `google_sync_tokens`

#### Cron Job (Supabase Scheduled Function)
- Roda a cada 15 minutos
- Para cada user com `is_active = true` em `google_sync_tokens`
- Executa sync incremental (pull + push) usando `syncToken`

### 3. Frontend

#### Página `IntegrationSettings.tsx` [NOVA]
- Card "Google Calendar & Tasks"
- Botão "Conectar Conta Google" → redireciona para OAuth consent screen
- Toggle para ativar/desativar sincronização
- Status da última sincronização
- Botão "Sincronizar Agora" (manual)

#### Indicadores visuais (ajustes em componentes existentes)
- Badge `🔗` nos agendamentos sincronizados com Google
- Badge `🔗` nas tarefas sincronizadas com Google Tasks

---

## Decisões Técnicas Críticas

### OAuth2 com Refresh Token (NÃO Service Account para Tasks)
O Google Tasks API **não suporta Service Account** para contas pessoais. É obrigatório usar o fluxo OAuth2 com consentimento do usuário + Refresh Token persistente. O Google Calendar **pode** usar Service Account, mas para consistência e simplicidade, usaremos **OAuth2 para ambos**.

### Direção de Sync
- **Tork → Google:** Eventos/tarefas criadas no CRM são empurradas para o Google (push on write)
- **Google → Tork:** Cron a cada 15 min puxa mudanças incrementais via `syncToken` (pull on schedule)
- **Conflito:** Se o mesmo item for editado nos dois lados entre syncs, o **último a ser sincronizado vence** (last-write-wins com log de conflito)

### Escopos OAuth necessários
```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/tasks
```

---

## Critérios de Aceite
1. Corretor consegue conectar sua conta Google nas configurações
2. Ao criar um agendamento no CRM, ele aparece no Google Calendar em até 1 minuto
3. Ao criar um evento no Google Calendar, ele aparece no CRM em até 15 minutos
4. Ao concluir uma tarefa no CRM, ela é marcada como concluída no Google Tasks
5. Ao concluir uma tarefa no Google Tasks, ela é marcada como concluída no CRM
6. O token é renovado automaticamente sem intervenção do usuário
7. O corretor pode desconectar a conta Google a qualquer momento
