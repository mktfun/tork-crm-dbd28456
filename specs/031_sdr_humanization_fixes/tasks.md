# TASKS: Autonomia Humana, Escalonamento e Correções no SDR (Spec 031)

## Fase 1: Supabase e DB Migration
- [ ] Criar e aplicar migration `sdr_humanization_db` via Supabase MCP:
  - `ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS ai_muted_until TIMESTAMPTZ;`
  - `ALTER TABLE brokerages ADD COLUMN IF NOT EXISTS admin_alert_phone VARCHAR;`
- [ ] Rodar `supabase gen types typescript` para gerar os types atualizados.

## Fase 1.5: UI Configuration de Alertas (`AutomationConfigTab.tsx`)
- [ ] Implementar field de "Telefone para Alertas" e garantir que faça update correto na table `brokerages`.

## Fase 2: Bloqueio Inicial e Segurança (`index.ts` e `resolveContext.ts`)
- [ ] No `resolveContext.ts`, extrair e retornar a flag de `ai_muted_until`.
- [ ] No `index.ts`, validar se a data de `ai_muted_until` do contexto for maior que a atual, e parar a IA silenciosamente.
- [ ] Em `index.ts`, adicionar a micropausa (debounce sleep de 2000ms).
- [ ] Melhorar captura de feedback salvando string crua em modo Teste.

## Fase 3: Tool de Escalonamento e Label (`toolsRegistry.ts`)
- [ ] Criar tool `escalate_to_human`.
- [ ] Implementar a lógica dessa tool: Modificar localmente o `ai_muted_until` deste cliente para NOW() + 24 HOURS no banco PostgreSQL.
- [ ] Adicionar na Chatwoot Integration Controller a inserção via API da label visível nos painéis (SDR_MUTED).

## Fase 4: Triagem e System Prompt (`buildPrompt.ts`)
- [ ] Declarar `escalate_to_human` nos allowedTools globais da triagem.
- [ ] Modificar condicional `!deal` para cliente existente x novo e humanizar saudação sem burocracia de triagem.
- [ ] Escrever `<CRITICAL_SECURITY_RULES>` para pensamento obrigatorio em `<thought>`.
- [ ] Sinalizar comportamentos de "solicitação alheia a nova venda / suporte" como critério mandatório para a Tool de escalonamento.

## Fase 5: Agente Loop Parser e Resposta Limpa (`agentLoop.ts`)
- [ ] Ajustar `agentLoop.ts` para capturar a `<thought>`, rodar `console.log(thought)` para debug.
- [ ] Aplicar Regex `replace()` para cortar as tags de lógica interna de forma a enviar apenas a resposta limpa para as pontas (Whatsapp, Histórico, etc).

## Fase 6: Deploy e Confirmação
- [ ] Subir as funções reestruturadas para Nuvem.
- [ ] Validar fluxo de 2ª via provocando o banimento provisório de 24h e tag sendo alocada no UI.
