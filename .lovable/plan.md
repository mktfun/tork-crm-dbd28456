

# Plano: 3 fixes no Dispatcher (Persona, clientJustResponded, Duplicata)

## Bug 1 — System prompt envia "proactive" ao invés do XML completo

**Causa raiz**: Linha 787 faz `<persona>\n${stageAiSettings.ai_persona}\n</persona>` — mas `ai_persona` armazena apenas o ID curto (`'proactive'`, `'supportive_sales'`, etc.). O dispatcher não tem o mapeamento ID → XML prompt completo. Esse mapeamento existe apenas no frontend (`aiPresets.ts`).

**Correção**: Criar um arquivo `supabase/functions/_shared/ai-presets.ts` com o mapeamento dos 4 IDs para os prompts XML completos (copiar os prompts de `src/components/automation/aiPresets.ts`). No `buildSystemPrompt` (linha 786-788), resolver o ID para o prompt completo antes de injetar.

Lógica:
```typescript
import { resolvePersonaPrompt } from '../_shared/ai-presets.ts'

// Linha 786-788 muda de:
if (stageAiSettings?.ai_persona) {
  systemPrompt += `<persona>\n${stageAiSettings.ai_persona}\n</persona>\n\n`
}

// Para:
const personaXml = resolvePersonaPrompt(stageAiSettings?.ai_persona)
if (personaXml) {
  systemPrompt += personaXml + '\n\n'
}
```

Também na linha 770 (triage mode), resolver o `ai_persona` se for um ID de preset.

## Bug 2 — `clientJustResponded is not defined` (erro nos logs)

**Causa raiz**: `clientJustResponded` é declarado com `let` na linha 1021, dentro do bloco `if (deals && deals.length > 0)` (escopo do `if`). Quando o deal é encontrado pelo caminho alternativo (conversation_id, linha 1043), a variável nunca é declarada. Na linha 1213 (BLOCO C), ela é referenciada fora do escopo → `ReferenceError`.

**Correção**: Mover a declaração `let clientJustResponded = false` para fora do bloco `if`, antes da busca de deals (~linha 997). Manter a lógica de cancelamento de follow-ups no mesmo lugar, apenas a declaração sobe.

## Bug 3 — Erro 23505 não reutiliza deal existente (plano já aprovado)

**Causa raiz**: No `autoCreateDeal`, quando o insert falha com `23505` (unique constraint), retorna `null` e o dispatcher segue com `hasDeal: false`.

**Correção**: No catch do erro `23505` em `autoCreateDeal`, buscar o deal existente por `chatwoot_conversation_id` e retorná-lo como reutilizado (conforme plano aprovado anteriormente).

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/_shared/ai-presets.ts` | **Novo** — mapeamento dos 4 IDs de persona para os prompts XML completos + função `resolvePersonaPrompt(id)` |
| `supabase/functions/chatwoot-dispatcher/index.ts` | (1) Importar `resolvePersonaPrompt`. (2) Linhas 770 e 786-788: resolver ID para XML. (3) Mover `clientJustResponded` para escopo correto (~linha 997). (4) No `autoCreateDeal`, fallback no erro 23505 para reutilizar deal |

Deploy do dispatcher necessário. Sem migration.

