# Design 032: Google Calendar + Google Tasks Integration

## Arquitetura Geral

```
┌─────────────┐     OAuth2      ┌──────────────────┐
│  Frontend   │ ──────────────→ │ Google OAuth      │
│  Settings   │ ←────────────── │ Consent Screen    │
└──────┬──────┘    callback     └──────────────────┘
       │
       │ save tokens
       ▼
┌──────────────┐
│  Supabase    │
│  google_     │   ┌──────────────────────┐
│  sync_tokens │──→│ Edge Fn: google-sync │
└──────────────┘   │  (Cron every 15min)  │
                   └──────────┬───────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
     ┌──────────────────┐          ┌──────────────────┐
     │ Google Calendar  │          │ Google Tasks      │
     │ API v3           │          │ API v1            │
     └──────────────────┘          └──────────────────┘
```

## Banco de Dados (Supabase)

### Tabela Nova: `google_sync_tokens`
- Armazena OAuth tokens por usuário
- RLS: cada usuário vê apenas seus próprios tokens
- `calendar_sync_token` para sync incremental do Calendar
- `refresh_token` encriptado (ou via Vault do Supabase)

### Colunas Adicionadas em `appointments`
- `google_event_id TEXT` — link para o evento no Google
- `google_synced_at TIMESTAMPTZ` — timestamp da última sync

### Colunas Adicionadas em `tasks`
- `google_task_id TEXT` — link para a tarefa no Google
- `google_synced_at TIMESTAMPTZ` — timestamp da última sync

## Edge Functions

### `google-auth-callback`
- Recebe o `code` do OAuth redirect
- Troca por tokens usando o Client Secret (armazenado em env vars)
- Salva em `google_sync_tokens`
- Redireciona o usuário de volta para `/settings/integrations`

### `google-sync` (Cron)
- Roda a cada 15 minutos via Supabase Scheduled Functions
- Para cada usuário com `is_active = true`:
  1. Verifica `token_expiry` → se expirado, usa `refresh_token` para renovar
  2. **Calendar Push:** Busca `appointments` com `google_event_id IS NULL` → POST para Calendar API
  3. **Calendar Pull:** Usa `calendar_sync_token` → GET incremental → insere/atualiza appointments
  4. **Tasks Push:** Busca `tasks` com `google_task_id IS NULL` → POST para Tasks API
  5. **Tasks Pull:** GET tasks do Google → compara `google_task_id` → atualiza status

### `google-sync-immediate` (Manual trigger)
- Endpoint que o frontend chama ao clicar "Sincronizar Agora"
- Executa o mesmo fluxo do cron mas só para o `userId` atual

## Frontend

### Nova Página: `IntegrationSettings.tsx`
- Localização: `src/pages/settings/IntegrationSettings.tsx`
- Rota: `/settings/integrations`
- Componentes: Antigravity direto (< 200 linhas JSX)
- Layout:
  - Card Google com ícone, status de conexão, toggle, botão de sync
  - Lista de logs das últimas sincronizações

### Ajustes nos componentes existentes
- `AppointmentDetailsModal`: Badge "🔗 Sincronizado com Google" quando `google_event_id` existe
- `Tasks.tsx`: Ícone pequeno na coluna de status quando `google_task_id` existe

## Mapa de Dependências

```
google-auth-callback ──→ google_sync_tokens (tabela nova)
google-sync (cron)   ──→ google_sync_tokens
                     ──→ appointments (colunas novas)
                     ──→ tasks (colunas novas)
IntegrationSettings  ──→ google_sync_tokens
                     ──→ google-auth-callback (redirect)
                     ──→ google-sync-immediate (botão)
```

## Segurança
- Client Secret do Google OAuth armazenado em `supabase secrets`
- Refresh tokens armazenados na tabela com RLS restritivo
- Tokens nunca expostos ao frontend (apenas flag `isConnected`)
- Revogação de tokens ao desconectar (chamar Google revoke endpoint)
