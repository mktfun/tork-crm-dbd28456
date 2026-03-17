

# Plano: Refatoração UI/UX do Módulo de Automação

## Diagnóstico

Após inspeção completa:

1. **ChatHistorySidebar**: Usa `absolute` positioning dentro do `AmorimAIFloating` (widget flutuante de chat). Não faz parte do `AIAutomationDashboard`. O layout do dashboard em si usa `grid-cols-5` com `SandboxFloatingCard` sticky -- funciona corretamente. A sidebar do chat flutuante é um overlay intencional dentro do widget. Nenhuma mudança estrutural necessária no dashboard grid.

2. **AutomationConfigTab**: Cards usam `<Card>` padrão sem glassmorphism. Falta botão "Testar Conexão" na seção AI API Key. Modelos desatualizados.

3. **VibeSelector**: Já é 100% controlado via props (`value`/`onChange`). A concorrência de estado está no `StageFlowCard` (useEffect na linha 97-99 re-sincroniza o vibe do servidor, causando flicker). O componente visual em si pode ser melhorado com melhor hierarquia.

---

## Mudanças Propostas

### 1. `AutomationConfigTab.tsx` -- Glassmorphism + Modelos Atualizados + Botão Testar IA

**A. Atualizar MODEL_OPTIONS (linhas 49-59):**
```ts
const MODEL_OPTIONS = {
  gemini: [
    { value: "gemini-2.5-pro-preview-05-06", label: "Gemini 2.5 Pro (Preview)" },
    { value: "gemini-2.5-flash-preview-04-17", label: "Gemini 2.5 Flash (Preview)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  openai: [
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "o3", label: "o3" },
    { value: "o3-mini", label: "o3-mini" },
    { value: "o4-mini", label: "o4-mini (Preview)" },
  ],
};
```

**B. Glassmorphism em todos os Cards:**
Substituir `<Card>` por `<Card className="bg-background/50 backdrop-blur-md border border-white/10 shadow-lg">` nos 4 cards (Motor de Inteligência, Chatwoot, Webhook, n8n).

**C. Botão "Testar Conexão IA" ao lado do campo API Key (linha 416-439):**
Alterar o layout do campo API Key para usar flex com gap, adicionando um botão visual com ícone `Wifi`:
```tsx
<div className="flex gap-2">
  <div className="relative flex-1">
    <Input type={...} ... />
    <Button ...eye toggle... />
  </div>
  <Button variant="outline" size="icon" title="Testar conexão com o provedor">
    <Wifi className="h-4 w-4" />
  </Button>
</div>
```
O botão será puramente visual (sem lógica), pronto para receber `onTestConnection` futuramente.

### 2. `VibeSelector.tsx` -- Redesign Visual

Melhorar o design dos cards com:
- Mostrar o `description` (atualmente oculto, só mostra `style`)
- Usar `backdrop-blur-sm` no card ativo para efeito glass
- Substituir `hover:scale-[1.02]` por `hover:translate-y-[-2px]` (padrão Tork)
- Aumentar padding para melhor legibilidade
- Ring visual no card ativo em vez de apenas border color

```tsx
<button className={cn(
  'relative flex flex-col items-center gap-2.5 p-4 rounded-xl border transition-all duration-200',
  'hover:translate-y-[-2px] active:scale-[0.98]',
  disabled && 'opacity-50 cursor-not-allowed',
  isActive
    ? cn(vibe.activeStyle, 'ring-1 ring-offset-1 ring-offset-background backdrop-blur-sm shadow-md')
    : 'border-border bg-secondary/30 hover:border-muted-foreground/30 hover:shadow-sm'
)}>
```

Exibir `description` abaixo do nome:
```tsx
<p className="text-sm font-medium">{vibe.shortName}</p>
<p className="text-[10px] text-muted-foreground leading-tight">{vibe.description}</p>
```

### 3. `StageFlowCard.tsx` -- Fix Concorrência de Estado do Vibe

O `useEffect` na linha 97-99 re-executa `inferVibeFromPersona` toda vez que `currentPersona` muda (incluindo após o próprio save do vibe). Isso causa um ciclo: user seleciona vibe → save → server retorna persona → useEffect re-infere → pode dar flicker.

**Fix**: Adicionar guard para não re-setar se o vibe inferido é o mesmo:
```tsx
useEffect(() => {
  const inferred = inferVibeFromPersona(currentPersona);
  setSelectedVibe(prev => prev === inferred ? prev : inferred);
}, [currentPersona]);
```

### 4. `ChatHistorySidebar.tsx` -- Glassmorphism Consistency

Aplicar classes glass no painel lateral:
- Container: `bg-background/80 backdrop-blur-xl border-r border-white/10` (já tem `bg-background/95 backdrop-blur-xl border-r border-white/10` -- ajuste mínimo para `bg-background/80`)

---

## Arquivos Afetados

| Arquivo | Mudanças |
|---------|----------|
| `AutomationConfigTab.tsx` | Glass cards, modelos atualizados, botão testar IA |
| `VibeSelector.tsx` | Redesign visual com glass + description |
| `StageFlowCard.tsx` | Fix guard no useEffect do vibe |
| `ChatHistorySidebar.tsx` | Ajuste opacity glass (minor) |

Nenhuma API alterada. Nenhum hook modificado. Apenas UI pura.

