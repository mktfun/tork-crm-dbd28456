# Design Document: SDR Security & Escalation Architecture

## 1. Dispatcher Validation Logic
No arquivo `supabase/functions/ai-assistant/index.ts`, a ordem de prioridade mudará para garantir isolamento:

1. **Check Simulation:** Se `is_simulation`, rodar Engine SDR e RETORNAR imediatamente.
2. **Identify Requester:**
    - Verificar se o `userId` possui uma role de corretor/admin.
    - Se a mensagem vier via Webhook (Chatwoot), verificar se o telefone do remetente está na tabela `producers` ou `profiles`.
3. **Routing decisions:**
    - **IF internal (Producer):** Run `Amorim AI` (Mentor Mode) with CRM tools.
    - **IF external (Client):** 
        - Run `engine-sdr.ts`.
        - If `engine-sdr` returns `null` (no workflow active or trigger mismatch), return a `204 No Content` or `ignore: true`.
        - **NEVER** fallback to `Amorim AI` prompt.

## 2. SDR Engine Hardening
A `processSDRFlow` em `engine-sdr.ts` será modificada para:
- Retornar um erro claro ou um objeto de "silêncio" caso o fluxo chegue a um fim sem saída.
- Adicionar suporte ao novo tipo de nó: `escalation`.

## 3. Escalar para Humano (Node Config)
### Nova Tool: `action_escalate`
**Propriedades (data.config):**
- `client_message`: Texto enviado ao cliente no chat.
- `internal_alert`: Texto enviado ao WhatsApp do humano.
- `human_phone`: Número do WhatsApp de destino.
- `pause_duration`: Horas de pausa da IA (ex: 1h, 24h, permanente).

### Efeito no Backend:
Quando este nó for atingido:
1. Enviar mensagem ao cliente via Chatwoot API.
2. Enviar mensagem ao humano via n8n/Wpp API.
3. Marcar metadado da conversa no Chatwoot/Supabase com `ai_paused_until: TIMESTAMP`.

## 4. UI Adjustments
- **SDRBuilder.tsx:** Adicionar ícone de "Headset" para a tool de escalonamento.
- **AutomationConfigTab.tsx:** Remover o bloco de "Telefone para Alertas (WhatsApp)" e a menção à pausa automática de 24h dali, movendo para o contexto do nó.
