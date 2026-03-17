

# Plano: Fix Persona Bug + Modelos Atualizados

## 1. Bug Critico — IDs desalinhados entre VIBE_CONFIG e AI_PERSONA_PRESETS

**Causa raiz encontrada**: Os IDs nao batem.

| VIBE_CONFIG (VibeSelector) | AI_PERSONA_PRESETS (aiPresets) | Resultado |
|---|---|---|
| `proactive` → "O Vendedor" | `proactive` → "O Vendedor" | OK |
| `technical` → "O Técnico" | `technical` → "O Técnico" | OK |
| `supportive` → "O Amigo" | `supportive` → "O Geral" | **BUG** |
| *(nao existe)* | `supportive_sales` → "O Amigo" | **Orfao** |

Quando o user clica "Amigo" no VibeSelector, `getVibePreset('supportive')` busca o preset com id `supportive`, que e "O Geral" (nao "O Amigo"). Salva o xmlPrompt do Geral. Depois, `inferVibeFromPersona` re-infere corretamente como `supportive`, mas o conteudo salvo e o errado. E se o user clicar varias vezes, a re-inferencia pode falhar porque o xmlPrompt nao bate com o esperado.

**Fix em `VibeSelector.tsx`**: Adicionar "O Geral" como 4o vibe e corrigir o mapeamento:

```
proactive  → "O Vendedor"  (id: proactive)
technical  → "O Técnico"   (id: technical)
supportive_sales → "O Amigo" (id: supportive_sales)
supportive → "O Geral"     (id: supportive)
```

Isso alinha 1:1 com os 4 presets de `aiPresets.ts`. Grid muda de `grid-cols-3` para `grid-cols-2 sm:grid-cols-4`.

**Arquivo**: `src/components/automation/VibeSelector.tsx`

## 2. Modelos de IA Atualizados (conforme especificado pelo usuario)

Substituir `MODEL_OPTIONS` em `AutomationConfigTab.tsx`:

```ts
const MODEL_OPTIONS = {
  gemini: [
    { value: "gemini-3.1-pro", label: "Gemini 3.1 Pro" },
    { value: "gemini-1.5-pro-002", label: "Gemini 1.5 Pro 002" },
    { value: "gemini-1.5-flash-002", label: "Gemini 1.5 Flash 002" },
    { value: "veo-3.1", label: "Veo 3.1" },
  ],
  openai: [
    { value: "gpt-5-pro", label: "GPT-5 Pro" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  ],
  grok: [
    { value: "grok-4.20-beta-2", label: "Grok 4.20 Beta 2" },
    { value: "grok-4.20-beta-1", label: "Grok 4.20 Beta 1" },
    { value: "grok-4", label: "Grok 4" },
    { value: "grok-3.5", label: "Grok 3.5" },
  ],
  anthropic: [
    { value: "claude-opus-4.6", label: "Claude Opus 4.6" },
    { value: "claude-sonnet-4.6", label: "Claude Sonnet 4.6" },
    { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  ],
  deepseek: [
    { value: "deepseek-r1", label: "DeepSeek R1" },
    { value: "deepseek-v3-0324", label: "DeepSeek V3-0324" },
    { value: "deepseek-v3-1226", label: "DeepSeek V3-1226" },
    { value: "deepseek-vl2", label: "DeepSeek VL2" },
  ],
};
```

Adicionar "Grok (xAI)" ao Select de provedores. O Select de provedores atual precisa incluir as 5 opcoes: Gemini, OpenAI, Grok, Anthropic, DeepSeek.

**Arquivo**: `src/components/automation/AutomationConfigTab.tsx`

## 3. KPIs — ja removidos

Os KPIs ja foram removidos do `AIAutomationDashboard.tsx` em iteracao anterior. Nao ha mais nada a fazer aqui.

---

## Arquivos Afetados

| Arquivo | Mudanca |
|---|---|
| `VibeSelector.tsx` | Adicionar 4o vibe ("O Geral"), corrigir mapeamento de IDs, ajustar grid |
| `AutomationConfigTab.tsx` | Atualizar MODEL_OPTIONS com versoes corretas + adicionar Grok |
| `StageFlowCard.tsx` | Atualizar tipo VibeId (agora inclui `supportive_sales`) |

Nenhuma API alterada. Nenhum hook modificado.

