

# Plano: Integrar Follow-ups no Dispatcher (arquitetura profissional)

## Conceito

O dispatcher já tem o ponto exato de interceptação: **após receber a resposta do n8n** (linha 938-943). Hoje ele ignora o corpo da resposta. A abordagem profissional é:

1. **Parsear a resposta do n8n** para detectar sinais de follow-up
2. **Usar configuração por etapa** (`crm_ai_settings`) para definir comportamento de follow-up
3. **Cancelar follow-ups anteriores** quando o cliente envia nova mensagem (o dispatcher já é chamado a cada mensagem incoming)

## Arquitetura

```text
Cliente manda msg → Dispatcher
  ├─ Cancela follow-ups pendentes deste deal (cliente respondeu!)
  ├─ Processa normalmente (resolve deal, prompt, etc.)
  ├─ Envia ao n8n
  ├─ Parseia resposta do n8n
  │   └─ Se resposta contém URL/proposta/cotação OU stage tem follow-up habilitado
  │       └─ Cria ai_follow_up com next_check_at = now + interval
  └─ Retorna sucesso

check-followups (cron 5min) → já implementado, cuida do resto
```

## Mudanças

### 1. Adicionar colunas em `crm_ai_settings` (migration)

```sql
alter table crm_ai_settings 
  add column if not exists follow_up_enabled boolean default false,
  add column if not exists follow_up_interval_minutes int default 60,
  add column if not exists follow_up_max_attempts int default 3,
  add column if not exists follow_up_message text;
```

Isso permite configurar follow-up **por etapa do funil** na UI de automação.

### 2. No dispatcher: 3 novos blocos de lógica

**Bloco A — Cancelar follow-ups ao receber mensagem incoming (antes de tudo)**

Logo após resolver o deal (linha ~798), se o deal existe, cancelar follow-ups pendentes:

```typescript
if (currentDeal?.id) {
  await supabase
    .from('ai_follow_ups')
    .update({ status: 'responded', updated_at: new Date().toISOString() })
    .eq('deal_id', currentDeal.id)
    .eq('status', 'pending');
}
```

Isso é limpo porque: o dispatcher **sempre** é chamado quando o cliente manda mensagem. Se ele respondeu, qualquer follow-up pendente vira "responded".

**Bloco B — Parsear resposta do n8n (após envio)**

```typescript
const n8nResponse = await fetch(finalN8nUrl, { ... });
let n8nResponseBody: any = null;
if (n8nResponse.ok) {
  try { n8nResponseBody = await n8nResponse.json(); } catch { /* ignore */ }
}
```

**Bloco C — Criar follow-up se necessário**

Duas fontes de decisão (OR):
1. **Configuração da etapa**: `stageAiSettings?.follow_up_enabled === true`
2. **Heurística da resposta do n8n**: presença de URL, palavras-chave ("cotação", "proposta", "link")

```typescript
async function shouldCreateFollowUp(
  stageAiSettings: any,
  n8nResponseBody: any,
): boolean {
  if (stageAiSettings?.follow_up_enabled) return true;
  
  const agentMessage = n8nResponseBody?.output || n8nResponseBody?.text || '';
  const hasUrl = /https?:\/\//.test(agentMessage);
  const hasKeywords = /cotação|proposta|orçamento|link|formulário/i.test(agentMessage);
  return hasUrl || hasKeywords;
}
```

Se `true`, inserir na `ai_follow_ups`:

```typescript
await supabase.from('ai_follow_ups').insert({
  deal_id: currentDeal.id,
  user_id: userId,
  chatwoot_conversation_id: conversation.id,
  brokerage_id: brokerageId,
  trigger_reason: stageAiSettings?.follow_up_enabled ? 'stage_config' : 'heuristic',
  follow_up_message: stageAiSettings?.follow_up_message || null,
  max_attempts: stageAiSettings?.follow_up_max_attempts || 3,
  interval_minutes: stageAiSettings?.follow_up_interval_minutes || 60,
  next_check_at: new Date(Date.now() + (stageAiSettings?.follow_up_interval_minutes || 60) * 60 * 1000),
});
```

### 3. Atualizar UI de automação (`crm_ai_settings` editor)

Adicionar toggle "Follow-up automático" por etapa com campos:
- Ativar/desativar
- Intervalo (minutos)
- Max tentativas
- Mensagem personalizada (opcional)

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| Nova migration | Adicionar colunas de follow-up em `crm_ai_settings` |
| `supabase/functions/chatwoot-dispatcher/index.ts` | Blocos A, B, C (cancelar, parsear, criar follow-up) |
| UI de automação (stage settings) | Campos de follow-up por etapa |
| `src/integrations/supabase/types.ts` | Auto-atualizado pela migration |

## Por que essa arquitetura é boa

- **Zero duplicação**: o `check-followups` já existe e cuida da execução; o dispatcher só cria e cancela
- **Configurável por etapa**: cada stage do funil pode ter comportamento diferente
- **Auto-cancelamento**: quando o cliente responde, o dispatcher cancela automaticamente (sem depender do cron)
- **Duas fontes de decisão**: config explícita (previsível) + heurística (inteligente)
- **Idempotente**: se já existe follow-up pendente para o deal, não cria outro

