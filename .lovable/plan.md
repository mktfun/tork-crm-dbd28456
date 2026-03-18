

# Plano: 3 Bug Fixes — Persona, XML Sandbox, Layout Sticky

## 1. Bug da Persona (StageFlowCard.tsx)

**Problema**: `handleVibeChange` salva `preset.xmlPrompt` (texto enorme) no banco. `inferVibeFromPersona` tenta match exato com xmlPrompt — falha quando presets compartilham palavras.

**Fix**:
- `handleVibeChange`: salvar o **ID curto** (`vibeId`) na coluna `ai_persona` em vez de `preset.xmlPrompt`
- `inferVibeFromPersona`: primeiro verificar se o valor é um ID curto válido (`proactive`, `technical`, `supportive_sales`, `supportive`). Se sim, retornar direto. Senão, fallback para match por xmlPrompt (retrocompatibilidade com dados antigos).

```ts
// StageFlowCard.tsx — linha 109
const handleVibeChange = useCallback((vibeId: VibeId) => {
  userSelectedRef.current = true;
  setSelectedVibe(vibeId);
  onSaveConfig({
    stage_id: stage.id,
    ai_persona: vibeId,  // salva ID curto, não xmlPrompt
  });
}, [stage.id, onSaveConfig]);
```

```ts
// StageFlowCard.tsx — linha 50
function inferVibeFromPersona(persona: string | null | undefined): VibeId | null {
  if (!persona) return null;
  // Match direto por ID curto
  const validIds: VibeId[] = ['proactive', 'technical', 'supportive_sales', 'supportive'];
  if (validIds.includes(persona as VibeId)) return persona as VibeId;
  // Fallback: match por xmlPrompt (dados legados)
  const match = AI_PERSONA_PRESETS.find(p => p.xmlPrompt === persona);
  if (match && match.id in VIBE_CONFIG) return match.id as VibeId;
  return null;
}
```

## 2. Bug do XML Raso (AISandbox.tsx)

**Problema**: Agora `ai_persona` pode ser `"supportive_sales"` (ID curto). O sandbox precisa resolver para o xmlPrompt real antes de montar o system prompt.

**Fix** (linha 76-78):
```ts
const activePersona = aiSetting?.ai_persona ?? pipelineDefault?.ai_persona ?? undefined;
// Resolve ID curto → xmlPrompt completo
const resolvedPreset = activePersona
  ? AI_PERSONA_PRESETS.find(p => p.id === activePersona) ?? AI_PERSONA_PRESETS.find(p => p.xmlPrompt === activePersona)
  : undefined;

// No sandboxConfig (linha 88):
aiPersona: resolvedPreset?.xmlPrompt ?? activePersona,
allowEmojis: resolvedPreset?.allowEmojis ?? false,
```

## 3. Bug de Layout (AIAutomationDashboard.tsx + SandboxFloatingCard.tsx)

**Problema**: `SandboxFloatingCard` com `col-span-2` e classes de posicionamento interfere na rolagem.

**Fix**: Eliminar o wrapper `SandboxFloatingCard` do dashboard. Colocar o `AISandbox` direto na coluna direita com `sticky top-4`:

```tsx
{/* AIAutomationDashboard.tsx — linha 222-238 */}
<div className="hidden lg:flex lg:col-span-2 sticky top-4 self-start">
  <div className="w-full h-[calc(100vh-12rem)] max-h-[680px] overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl">
    <AISandbox ... />
  </div>
</div>
```

O `SandboxFloatingCard.tsx` pode ser mantido mas não será mais usado no dashboard. O import será removido.

## Arquivos Afetados

| Arquivo | Mudanca |
|---|---|
| `StageFlowCard.tsx` | `inferVibeFromPersona` com match por ID curto + `handleVibeChange` salva ID |
| `AISandbox.tsx` | Resolver ID curto → xmlPrompt antes de montar config |
| `AIAutomationDashboard.tsx` | Inline sticky div, remover `SandboxFloatingCard` |

