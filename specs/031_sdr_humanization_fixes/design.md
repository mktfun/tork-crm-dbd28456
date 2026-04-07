# DESIGN: Autonomia Humana, Escalonamento e Correções no SDR (Spec 031)

## Avaliação do Estado do Banco
Para a desativação da IA temporariamente (24h de muting), precisaremos saber se faremos isso na tabela de contatos ou de conversas. 
A forma mais viável é na tabela `crm_clients`, adicionando uma coluna:
- `ai_muted_until` (timestamp with time zone). 
- Quando o chatwebhook da Supabase dispatcher processar as mensagens, o `resolveContext.ts` ou o loop inicial verificará: `if (client.ai_muted_until && new Date() < new Date(client.ai_muted_until)) return; // abort AI`.

## Arquitetura de Mudança (Supabase + Edge Functions)

### 1. Migração de Banco (`apply_migration`)
- `add_ai_muted_until_to_clients.sql`: Altera a tabela `crm_clients` p/ coluna `ai_muted_until`.
- `add_admin_alert_phone.sql`: Altera a tabela `brokerages` colocando a coluna `admin_alert_phone` (varchar).
- Integração da lógica desta coluna ao Chatwoot? Quando a Tool for chamada, o sistema:
   1) atualiza `crm_clients` com `ai_muted_until`.
   2) Dispara API do Chatwoot inserindo a label `SDR_MUTED` na conversa atual.
   3) Envia requisição via webhook interno do Chatwoot ou de envio de WhatsApp independente, alertando para o número `admin_alert_phone`.

### 1.2 Frontend (Stitch/React)
- A tela `AutomationConfigTab.tsx` receberá um input "Telefone de Alerta (SDR)". Isso será persistido no objeto de configuração das `brokerages`.

### 2. Edge Function: `index.ts` (Core Webhook Event)
- **Sleep de Debounce:** `await new Promise(r => setTimeout(r, 2000))` dentro de `processWebhook`.
- **DLP Feedbacks:** Utilizar `rawCleanContent` em testes (`ai_feedbacks`).
- **Bloqueio Global (Mute Check):** Abortar execução da IA imediatamente se a propriedade `ai_muted_until` do Context for >= AGORA.

### 3. Edge Function: `modules/buildPrompt.ts` (SDR Context Maker & Triagem)
- Implementação de `<thought>` global mandatory em `<CRITICAL_SECURITY_RULES>`.
- Nova abordagem para "Nenhuma Negociação":
  - Entregar um mapa das operações (ex: "Se é 2ª via ou solicitação administrativa para a qual não encontra ferramenta, USE escalate_to_human obrigando a paralização").
  - Menos robotização, cumprimento curto "Diga como ajudar?".

### 4. Edge Function: `modules/security/toolsRegistry.ts` (Tooling do LLM)
- **Nova Tool:** `escalate_to_human`
  - *descrição pro LLM:* "Se o cliente fizer uma solicitação técnica fora do fluxo vendas (ex: 2ª via de boleto, cancelamento de apólice, problema urgente), acione essa tool para pausar o robô internamente. IMPORTANTE: Fale como VOCÊ mesmo e não saia da persona. Diga algo como 'Ok, já vou providenciar isso, aguarde um momento por favor.' Nunca diga que é um bot transferindo para equipe."
  - *Comportamento do Tool Exec:* Faz o UPDATE no banco no `crm_clients` com a data de expiração, e adiciona a Label no Chatwoot para sinalização visual.

### 5. Edge Function: `modules/agentLoop.ts` (O Motor do Agente)
- Filtro Regex para ofuscar o pensamento `<thought>...</thought>` apenas na hora de renderizar o string final, liberando no console de debug para auditoria.
