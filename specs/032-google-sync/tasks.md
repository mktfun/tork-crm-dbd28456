# Tasks 032: Google Calendar + Google Tasks Integration

## Fase 0 — Setup Google Cloud
- [x] Criar Projeto no Google Cloud Console
- [x] Habilitar Google Calendar API
- [x] Habilitar Google Tasks API
- [x] Criar credenciais OAuth 2.0 (Client ID + Client Secret)
- [x] Configurar redirect URI para Edge Function callback
- [x] Salvar Client ID e Client Secret nos secrets do Supabase

## Fase 1 — Backend (Banco de Dados)
- [x] Criar tabela `google_sync_tokens` com migration
- [x] Adicionar colunas `google_event_id` e `google_synced_at` em `appointments`
- [x] Adicionar colunas `google_task_id` e `google_synced_at` em `tasks`
- [x] Criar RLS policies para `google_sync_tokens`
- [x] Regenerar tipos TypeScript (`supabase gen types`)

## Fase 2 — Backend (Edge Functions)
- [x] Criar `google-auth-callback` — troca code por tokens e salva
- [x] Criar `google-auth-url` — gera URL OAuth com secrets do servidor
- [x] Criar módulo `_shared/google-auth.ts` — helper para refresh de tokens
- [x] Criar `google-sync` — lógica de push/pull para Calendar e Tasks
- [x] Criar `google-sync-immediate` — trigger manual (wrapper do sync)
- [ ] Configurar Cron Job no Supabase para `google-sync` a cada 15 min (ação manual no dashboard Supabase)
- [ ] Testar full sync com conta de teste

## Fase 3 — Frontend
- [x] Criar `IntegrationSettings.tsx` em `/settings/integrations`
- [x] Adicionar rota no `App.tsx` e link no menu de configurações
- [x] Implementar card Google: botão conectar, status, toggle, sync manual
- [x] Adicionar badge de sync nos Appointments e Tasks existentes
- [ ] Testar fluxo completo de conexão → sync → desconexão

## Fase 4 — Validação
- [ ] Criar agendamento no CRM → verificar aparece no Google Calendar
- [ ] Criar evento no Google Calendar → verificar aparece no CRM em até 15 min
- [ ] Marcar tarefa como concluída no CRM → verificar no Google Tasks
- [ ] Marcar tarefa como concluída no Google Tasks → verificar no CRM
- [ ] Desconectar conta → verificar tokens removidos e sync parado
