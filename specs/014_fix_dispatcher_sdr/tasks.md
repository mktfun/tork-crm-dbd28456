# Tasks: Fix Dispatcher SDR (Spec 014)

## Fase 1 — Corrigir Detecção de Admin
- `[x]` Reescrever `normalizeTo10Digits()` em `resolveContext.ts` para comparar 10 E 11 dígitos com flexibilidade
- `[x]` Adicionar log de debug: `console.log('🔍 Phone comparison:', { senderNorm, dbNorm })`
- `[x]` Limpar cliente-fantasma do admin no banco (se existir)

## Fase 2 — Integrar SDR Engine no Dispatcher (CRÍTICO)
- `[x]` Adaptar `getActiveSDRWorkflow()` e `processSDRFlow()` para imports compatíveis com o dispatcher (JSR)
- `[x]` Em `chatwoot-dispatcher/index.ts`, adicionar bloco ANTES do `buildPrompt()` para clientes:
  - `[x]` Buscar `crm_sdr_workflows` ativo do `userId`
  - `[x]` Verificar `trigger_config` (target_audience, stage_rule) contra contexto atual
  - `[x]` Se match → `processSDRFlow(workflow, content, history, supabase, userId)`
  - `[x]` Se resposta válida → `sendChatwootMessage()` → return (skip buildPrompt)
  - `[x]` Se sem match ou sem workflow → continuar para triagem ou fluxo antigo
- `[x]` Em `chatwoot-dispatcher/index.ts`, checar `body.conversation?.labels` (verificar se inclui "off", "bot-off" ou "ai-off") e interromper processo se existir
- `[x]` Garantir que conversation_history do dispatcher é passado como `history`
- `[x]` Garantir que audio synthesis + save history ocorram após SDR response

## Fase 3 — Corrigir Simulador
- `[x]` Em `ai-assistant/index.ts`, no bloco `is_simulation`:
  - `[x]` Garantir que `workflow_data` receba `name` e `id` mock se não existirem
  - `[x]` Se `processSDRFlow()` retorna null → retornar `{ message: "Fim do fluxo", error: "SDR_FLOW_END" }` e NUNCA cair no Amorim
- `[x]` Em `SDRSimulator.tsx`, tratar `error === "SDR_FLOW_END"` com mensagem amigável

## Fase 4 — Modo Triagem Inteligente (sem workflow, sem deal)
- `[x]` Criar módulo `triageHandler.ts` no dispatcher:
  - `[x]` Prompt de triagem: conversar naturalmente, entender necessidade, NÃO forçar
  - `[x]` Injetar lista de pipelines/stages/produtos disponíveis no prompt
  - `[x]` LLM retorna `{ response: "...", classification: null | { pipeline_id, stage_id, product_id } }`
- `[x]` Quando `classification != null`:
  - `[x]` Criar Deal no CRM (pipeline+stage+produto) via `autoCreateDeal` ou insert direto
  - `[x]` Enviar alerta pro admin via `admin_alert_phone` da brokerage (com contexto: nome, produto, funil)
  - `[x]` Responder ao cliente com mensagem contextual natural (NÃO genérica)
  - `[x]` Auto-Mute 1: setar `ai_muted_until = '9999-12-31'` no `crm_clients` (mute permanente)
  - `[x]` Auto-Mute 2: Fazer POST request pro `/api/v1/accounts/{id}/conversations/{id}/labels` do Chatwoot adicionando a etiqueta `"off"`
- `[x]` Quando `classification == null`:
  - `[x]` Responder normalmente e aguardar próxima msg (multi-turn triage)

## Fase 5 — Validação de Gatilho Único (UI)
- `[x]` Em `SDRBuilder.tsx`, no `handleSave`:
  - `[x]` Ao ativar workflow, verificar se existe outro ativo com mesmo `trigger_config.target_audience`
  - `[x]` Se sim → desativar anterior automaticamente
  - `[x]` Toast: "Workflow 'X' foi desativado para evitar conflito"

## Fase 6 — Deploy e Teste End-to-End
- `[ ]` `supabase functions deploy chatwoot-dispatcher`
- `[ ]` `supabase functions deploy ai-assistant`
- `[ ]` Testar com número de admin → deve reconhecer como admin (NÃO como SDR)
- `[ ]` Testar com número desconhecido + sem workflow → deve entrar em triagem, qualificar, escalar, mutar
- `[ ]` Testar com número desconhecido + com workflow → deve acionar SDR workflow do builder
- `[ ]` Testar simulador → deve seguir grafo sem vazar pro Amorim
- `[ ]` Testar /teste com admin → deve simular SDR
