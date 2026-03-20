

# Plano: Dispatcher usando config do usuário + classificação com janela de conversa

## Diagnóstico

Encontrei **2 problemas raiz** que causam o 401 e a falta de criação do deal:

### Problema 1: Dispatcher ignora a config de IA do usuário
O dispatcher usa `LOVABLE_API_KEY` + `ai.gateway.lovable.dev` **hardcoded** em 5 pontos:
- `classifyLeadWithAI()` (linha 48-51)
- `evaluateObjectiveCompletion()` (linha 268-270)
- `processAttachments()` (linhas 439-442, 460-462)

Mas o `LOVABLE_API_KEY` do projeto retorna **401** no gateway. Enquanto isso, o usuário tem uma **Gemini API key funcional** salva em `crm_ai_global_config.api_key` (provider: `gemini`, model: `gemini-2.5-flash`).

O `ai-assistant` e o `generate-summary` já foram corrigidos para usar `resolveUserModel()` e rotear direto para a API do Google quando há chave Gemini do usuário. Mas o **dispatcher nunca foi atualizado** — continua batendo no gateway com uma key que dá 401.

### Problema 2: Classificação usa só a última mensagem
O `classifyLeadWithAI()` recebe só o `content` da mensagem atual. Quando o cliente diz "residencial" na 3a mensagem, o contexto de "preciso de um seguro" já se perdeu. A classificação recebe só "residencial" e pode não ter contexto suficiente para decidir.

### Problema 3: crm_ai_settings vazios
Nenhuma etapa do pipeline "Seguros" tem `crm_ai_settings` configurado (todos `null`). Isso significa que mesmo se o deal fosse criado, o `stageAiIsActive` seria `false` e não teria persona/objetivo customizado. Isso não é um bug de código, mas o usuário precisa configurar na tela de automação.

## Solução

### 1. Importar `resolveUserModel` no dispatcher e resolver config dinâmica

Após resolver o `userId`, chamar `resolveUserModel(supabase, userId)` para obter `{ model, apiKey, provider }`. Usar esses valores em vez dos hardcoded em todos os pontos de chamada de IA.

Criar helper no topo do dispatcher:

```typescript
import { resolveUserModel } from '../_shared/model-resolver.ts'

// Resolved at request time, after userId is known
let resolvedAI: { url: string; auth: string; model: string } = {
  url: AI_GATEWAY_URL,
  auth: `Bearer ${LOVABLE_API_KEY}`,
  model: 'google/gemini-2.5-flash-lite',
}

function initAIConfig(resolved: { model: string; apiKey: string | null; provider: string | null }) {
  if (resolved.apiKey && resolved.provider === 'gemini') {
    resolvedAI = {
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      auth: `Bearer ${resolved.apiKey}`,
      model: resolved.model.replace('google/', ''),
    }
  } else if (resolved.apiKey && resolved.provider === 'openai') {
    resolvedAI = {
      url: 'https://api.openai.com/v1/chat/completions',
      auth: `Bearer ${resolved.apiKey}`,
      model: resolved.model.replace('openai/', ''),
    }
  } else if (LOVABLE_API_KEY) {
    resolvedAI = {
      url: AI_GATEWAY_URL,
      auth: `Bearer ${LOVABLE_API_KEY}`,
      model: resolved.model || 'google/gemini-2.5-flash-lite',
    }
  }
}
```

Substituir todas as chamadas `fetch(AI_GATEWAY_URL, { headers: { Authorization: Bearer ${LOVABLE_API_KEY} } })` por `fetch(resolvedAI.url, { headers: { Authorization: resolvedAI.auth } })` e `model: resolvedAI.model`.

**Pontos de substituição:** `classifyLeadWithAI`, `evaluateObjectiveCompletion`, `processAttachments` (2 chamadas).

### 2. Classificação com janela de conversa

Antes de chamar `classifyLeadWithAI`, buscar as últimas N mensagens da conversa no Chatwoot (já temos as credenciais via `brokerageId`) e concatenar como contexto:

```typescript
// Inside autoCreateDeal, before calling classifyLeadWithAI:
let conversationHistory = messageContent
if (brokerageId) {
  // fetch last 10 messages from Chatwoot conversation
  const msgs = await fetchRecentMessages(brokerageId, conversationId, 10)
  if (msgs) conversationHistory = msgs + '\n' + messageContent
}
const aiResult = await classifyLeadWithAI(conversationHistory, pipelinesWithStages, activeProducts || [])
```

Isso requer passar `brokerageId` e `conversation.id` para `autoCreateDeal`.

### 3. Assinatura atualizada de `autoCreateDeal`

Adicionar parâmetros `brokerageId` e `chatwootConversationId` para poder buscar histórico.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/chatwoot-dispatcher/index.ts` | Importar `resolveUserModel`, criar helper `initAIConfig`, substituir 5 chamadas hardcoded, adicionar busca de histórico na classificação |

Nenhuma migration. Nenhuma mudança de frontend. Apenas o dispatcher.

