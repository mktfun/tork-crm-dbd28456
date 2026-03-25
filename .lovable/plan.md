

# Plano: Corrigir System Prompt — Persona + Placeholders

## O que está errado

### Bug 1: Placeholders nunca substituídos
Os presets em `ai-presets.ts` usam `{{ai_name}}`, `{{company_name}}`, `{{missao_ai}}`, `{{next_stage_name}}`. A função `resolvePersonaPrompt` retorna o template cru. O `buildPrompt.ts` injeta sem substituir. O AI recebe literal `{{missao_ai}}`.

### Bug 2: Sem fallback de persona quando tem deal
Linha 120-123 de `buildPrompt.ts`:
```typescript
const personaXml = resolvePersonaPrompt(stageAiSettings?.ai_persona)
if (personaXml) {
  systemPrompt += personaXml + '\n\n'
}
```
Se `ai_persona` não está configurado na etapa, **nenhuma persona é injetada**. O prompt fica só com identity + security rules + context — sem regras de conversa, sem objection handling, sem output rules, sem nada.

No caminho sem deal (triagem), existe fallback para `globalBaseInstructions`. No caminho com deal, não existe.

## Correções

### 1. `buildPrompt.ts` — Substituir placeholders
Após resolver a persona, substituir os placeholders pelos valores reais:
- `{{ai_name}}` → `agentName`
- `{{company_name}}` → `companyName`
- `{{missao_ai}}` → `stageAiSettings?.ai_objective || 'Atender o cliente e coletar informações necessárias'`
- `{{next_stage_name}}` → nome da próxima etapa (já resolvido no código)

### 2. `buildPrompt.ts` — Fallback de persona no caminho "has deal"
Se a etapa não tem `ai_persona`, usar `globalBaseInstructions` como persona. Se nem isso existir, usar um preset default (ex: `supportive` / geral).

### 3. Implementar guards no `evaluateStageCompletion.ts` (plano anteriormente aprovado)
O plano anterior foi aprovado mas a implementação foi cancelada. Adicionar:
- Guard de idade do deal (<60s → skip)
- Guard de mensagens do agente (0 respostas → skip)
- Prompt melhorado que exige ação do agente, não só intenção do cliente

## Arquivo afetado: `buildPrompt.ts`

Trecho do caminho "has deal" (linhas 116-133) ficará:

```typescript
// Has deal — stage-specific mode
stageAiIsActive = stageAiSettings?.is_active ?? false

let personaXml = resolvePersonaPrompt(stageAiSettings?.ai_persona)
// Fallback: use global base instructions or default preset
if (!personaXml) {
  personaXml = globalBaseInstructions
    ? `<persona>\n${globalBaseInstructions}\n</persona>`
    : resolvePersonaPrompt('supportive') // preset "geral" como fallback
}

// Resolve next stage name for placeholder substitution
let resolvedNextStageName = ''
// (next stage resolution code runs here, moved up)

// Replace placeholders in persona
if (personaXml) {
  personaXml = personaXml
    .replace(/\{\{ai_name\}\}/g, agentName)
    .replace(/\{\{company_name\}\}/g, companyName)
    .replace(/\{\{missao_ai\}\}/g, stageAiSettings?.ai_objective || 'Atender o cliente e coletar as informações necessárias para avançar')
    .replace(/\{\{next_stage_name\}\}/g, resolvedNextStageName)
  systemPrompt += personaXml + '\n\n'
}
```

Mesma substituição para o caminho sem deal (triagem, linha 104).

## Arquivo afetado: `evaluateStageCompletion.ts`

Adicionar antes da chamada AI (linha 50):
```typescript
// Guard: skip if deal was created less than 60s ago
const dealAge = Date.now() - new Date(params.deal.created_at).getTime()
if (dealAge < 60_000) {
  console.log('⏳ Skipping objective eval: deal < 60s old')
  return result
}

// Guard: skip if bot hasn't responded yet
const msgs = (messagesData.payload || []).slice(-6)
const agentMessages = msgs.filter((m: any) => m.message_type === 1)
if (agentMessages.length < 1) {
  console.log('⏳ Skipping objective eval: no agent responses yet')
  return result
}
```

Melhorar o prompt do avaliador para exigir ação do agente.

## Resultado esperado

- Prompt gigante com todas as regras (voice, internal_reasoning, objection_handling, output_rules, etc.) sempre presente
- Placeholders substituídos por valores reais (nome do agente, empresa, objetivo da etapa)
- Deals recém-criados não são avaliados prematuramente
- Bot não pula etapas na primeira mensagem

