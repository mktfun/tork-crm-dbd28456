

# Fase Final: KPIs no Dashboard + Campo `is_active` no Dispatcher

## 1. Edge Function — chatwoot-dispatcher

Analisando o `derived_data` atual (linhas 504-530), já existem:
- `deal_title` (linha 511) ✅
- `pipeline_id` (linha 512) ✅  
- `stage_id` (linha 513) ✅
- `stage_ai_is_active` (linha 518) — vem do `promptResult`, não diretamente do `stageAiSettings`

**Falta apenas**: `is_active: stageAiSettings?.is_active ?? true` como campo direto do `stageAiSettings`.

**Mudança**: Adicionar uma linha no bloco `derived_data`:
```ts
is_active: stageAiSettings?.is_active ?? true,
```

Inserir logo após `stage_ai_is_active` (linha 518).

## 2. KPIs no AIAutomationDashboard.tsx

Adicionar uma faixa de 4 KPI cards inline (sem criar arquivo novo) acima do grid de Timeline+Sandbox, dentro do `TabsContent value="etapas"`.

### Métricas calculadas com dados já disponíveis:

| KPI | Cálculo | Ícone | Cor |
|---|---|---|---|
| Etapas no Funil | `stages.length` | `Layers` | `bg-blue-500/10 text-blue-500` |
| IA Ativa | `aiSettings.filter(s => s.is_active).length` + subtítulo `X% cobertura` | `Sparkles` | `bg-emerald-500/10 text-emerald-500` |
| Configuradas | `aiSettings.length` | `Settings2` | `bg-amber-500/10 text-amber-500` |
| Funis Totais | `pipelines.length` | `GitBranch` | `bg-purple-500/10 text-purple-500` |

### Layout:
- Grid `grid-cols-2 lg:grid-cols-4 gap-4` com padding `px-4 pt-4`
- Cada card: `rounded-xl border border-border bg-card p-4` com ícone em container colorido, valor em `text-2xl font-bold`, label em `text-sm text-muted-foreground`, subtítulo opcional em `text-xs`
- KPI card abstraído como função inline ou sub-componente local no mesmo arquivo

### Arquivos afetados:
- `supabase/functions/chatwoot-dispatcher/index.ts` — 1 linha adicionada
- `src/components/automation/AIAutomationDashboard.tsx` — KPI strip + imports de ícones

