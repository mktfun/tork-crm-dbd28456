

# Plano: Fix do Bug de Persona + Cleanup Visual + Modelos Atualizados

## 3 Problemas a Resolver

### 1. Bug critico: Persona volta ao anterior ao clicar

**Causa raiz**: O ciclo de concorrencia funciona assim:
1. User clica no vibe "Tecnico"
2. `handleVibeChange` faz `setSelectedVibe('technical')` + `onSaveConfig({ ai_persona: xmlPrompt })`
3. Save dispara invalidacao do React Query
4. `currentPersona` atualiza com o XML novo
5. `useEffect` roda `inferVibeFromPersona(currentPersona)` -- esta funcao usa keyword matching fragil (`SDR`, `CNPJ`, `tecnico`, etc.)
6. Se as keywords nao batem (ex: o preset "O Geral" nao tem nenhuma das keywords), retorna `null`
7. `setSelectedVibe(null)` -- **perde a selecao do usuario**

**Fix**: Substituir `inferVibeFromPersona` (keyword matching fragil) por comparacao direta contra os `xmlPrompt` dos presets. Isso e deterministico e nunca erra:

```ts
function inferVibeFromPersona(persona: string | null | undefined): VibeId | null {
  if (!persona) return null;
  const match = AI_PERSONA_PRESETS.find(p => p.xmlPrompt === persona);
  if (match && match.id in VIBE_CONFIG) return match.id as VibeId;
  return null;
}
```

Alem disso, adicionar uma **ref de "user intent"** no `StageFlowCard` para ignorar o useEffect quando a mudanca veio do proprio usuario:

```ts
const userSelectedRef = useRef(false);

const handleVibeChange = useCallback((vibeId: VibeId) => {
  userSelectedRef.current = true;
  setSelectedVibe(vibeId);
  // ... save
}, [...]);

useEffect(() => {
  if (userSelectedRef.current) {
    userSelectedRef.current = false;
    return; // Skip -- this update came from our own save
  }
  const inferred = inferVibeFromPersona(currentPersona);
  setSelectedVibe(prev => prev === inferred ? prev : inferred);
}, [currentPersona]);
```

**Arquivo**: `src/components/automation/StageFlowCard.tsx`

---

### 2. Remover KPIs inuteis + limpar visual da aba "Configurar Etapas"

O usuario disse: "n quero esses kpis do topo pq n e nada" e "ta feio fora do padrao".

**Mudancas no `AIAutomationDashboard.tsx`**:
- **Remover** o bloco inteiro de KPIs (linhas 199-226) -- os 3 cards "Total de Conversas" (valor fixo "---"), "Etapas Ativas" e "Taxa de Automacao"
- O `SalesFlowTimeline` ja mostra `{stages.length} etapas - {activeCount} com IA ativa` na barra interna, tornando os KPIs redundantes

**Mudancas visuais gerais (padronizar com o sistema)**:
- O `StageFlowCard` usa `bg-card/50 backdrop-blur-sm` -- trocar para usar classes semanticas do design system (`border-border bg-card`) sem glass excessivo
- O `SandboxFloatingCard` esta bom como esta (sticky, col-span-2)

---

### 3. Atualizar catalogo de modelos de IA

Baseado nos modelos ativos em marco de 2026, reorganizar `MODEL_OPTIONS` com 4 provedores e 2-4 versoes cada:

```ts
const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  gemini: [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  ],
  openai: [
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "o3", label: "o3" },
    { value: "o4-mini", label: "o4-mini" },
  ],
  anthropic: [
    { value: "claude-sonnet-4", label: "Claude Sonnet 4" },
    { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  ],
  deepseek: [
    { value: "deepseek-v3", label: "DeepSeek V3" },
    { value: "deepseek-r1", label: "DeepSeek R1" },
  ],
};
```

Atualizar o `<Select>` de provedor para incluir "Anthropic" e "DeepSeek" como opcoes.

**Nota backend**: A logica de chamada real a API (edge function `chatwoot-dispatcher`) ja usa a API key + model do `crm_ai_global_config`. Adicionar mais provedores na UI nao quebra nada -- o backend ja resolve pelo campo `ai_provider` + `ai_model`. Se o usuario configurar Anthropic mas o dispatcher so suportar Gemini, isso e uma limitacao de backend que nao faz parte desta tarefa de UI.

**Arquivo**: `src/components/automation/AutomationConfigTab.tsx`

---

## Arquivos Afetados

| Arquivo | Mudanca |
|---------|---------|
| `StageFlowCard.tsx` | Fix do bug de persona (inferencia + ref de intent) |
| `AIAutomationDashboard.tsx` | Remover bloco de KPIs |
| `AutomationConfigTab.tsx` | Atualizar MODEL_OPTIONS + adicionar provedores |

Nenhuma API alterada. Nenhum hook modificado. Apenas UI e logica local de estado.

