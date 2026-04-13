# TASKS: Autonomia Humana, Escalonamento e Correções no SDR (Spec 031)

## Fase 1: Supabase e DB Migration
- [/] Criar e aplicar migration `sdr_humanization_db` via Supabase MCP:
  - `ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS ai_muted_until TIMESTAMPTZ;`
  - `ALTER TABLE brokerages ADD COLUMN IF NOT EXISTS admin_alert_phone VARCHAR;`
  - ⚠️ **PENDENTE**: Rodar no SQL Editor do Supabase — arquivo em `supabase/migrations/20260407_sdr_humanization_db.sql`
- [ ] Rodar `supabase gen types typescript` para gerar os types atualizados.

## Fase 1.5: UI Configuration de Alertas (`AutomationConfigTab.tsx`)
- [x] Implementar field de "Telefone para Alertas" — persistido na table `brokerages.admin_alert_phone`.

## Fase 2: Bloqueio Inicial e Segurança (`index.ts` e `resolveContext.ts`)
- [x] No `index.ts`, validar se `ai_muted_until` do cliente é >= agora, e parar a IA silenciosamente.
- [x] Em `index.ts`, adicionar a micropausa de debounce (2000ms antes do checkDebounce).
- [x] Melhorar captura de feedback do /teste usando `rawCleanContent` (sem mascaramento DLP).

## Fase 3: Tool de Escalonamento e Label (`toolsRegistry.ts`)
- [x] Criar tool `escalate_to_human` com descrição correta de persona (fica em caráter de Rodrigo).
- [x] Implementar lógica da tool: update `crm_clients.ai_muted_until = NOW + 24h`.
- [x] Adicionar label `sdr-pausado` na conversa do Chatwoot via API.
- [x] Adicionar nota privada na conversa com motivo do escalonamento + telefone admin.

## Fase 4: Triagem e System Prompt (`buildPrompt.ts`)
- [x] Declarar `escalate_to_human` + `check_available_products` nos allowedTools da triagem.
- [x] Bifurcar objetivo `!deal`: cliente existente (`clientId`) vs novo contato.
- [x] Adicionar instrução `<thought>` obrigatório em `CRITICAL_SECURITY_RULES` com exemplo.
- [x] Sinalizar comportamentos de suporte fora de vendas como gatilho para `escalate_to_human`.

## Fase 5: Agente Loop Parser e Resposta Limpa (`agentLoop.ts`)
- [x] Aceitar `ToolContext` como parâmetro e passar ao `executeToolCall`.
- [x] Capturar e logar `<thought>` no console do servidor (debug).
- [x] Aplicar Regex strip das tags `<thought>` antes de enviar resposta ao cliente.
- [x] Aumentar temperature para 0.7 (respostas mais naturais).

## Fase 6: Deploy e Confirmação
- [ ] **[VOCÊ]** Rodar SQL migration no Supabase Dashboard (arquivo: `supabase/migrations/20260407_sdr_humanization_db.sql`)
- [ ] **[VOCÊ]** Deploy: `npx supabase functions deploy chatwoot-dispatcher` no terminal local
- [ ] **[VOCÊ]** Validar: enviar "oi" + "tudo bem?" rápido → apenas 1 resposta
- [ ] **[VOCÊ]** Validar: cliente existente → saudação curta e natural (sem triagem robótica)
- [ ] **[VOCÊ]** Validar: pedir "2ª via do boleto" → IA responde resolutiva + Chatwoot recebe label `sdr-pausado`
