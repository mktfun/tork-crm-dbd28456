# Design: 004-dre-provisoes-fix

## Divisão de responsabilidades

Tudo é `Antigravity` (ajuste em código existente). Nenhum Stitch MCP necessário (nenhuma tela nova).

---

## Fix A: DRE

### Mapa de mudanças

```
financialService.ts
  └── getDreData(year?, startDate?, endDate?)
        └── rpc('get_dre_data', { p_year, p_start_date: null, p_end_date: null })
              ← ALWAYS passes 3 args to avoid PGRST203 overload ambiguity

DreTable.tsx L98
  └── useDreData(selectedYear)   ← remove os `undefined, undefined`
```

### Sem mudanças no banco
O overload já existe no PostgreSQL. Só precisamos resolver pelo lado cliente passando sempre 3 args.

---

## Fix B: Provisões Scroll-to-Zoom

### Arquitetura de dados

```
ProvisoesTab
  ├── horizonMonths (state) → período de busca total
  ├── granularity (state: 'day'|'week'|'month') → passa pro hook E pro chart
  ├── viewportSummary (state) ← NOVO: KPIs derivados do viewport visível
  │     ├── income
  │     ├── expense
  │     └── balance
  └── ProjectedCashFlowChart
        ├── props: data, isLoading, granularity, onGranularityChange (NEW), onViewportChange (NEW)
        └── interno:
              ├── viewStart / viewEnd (estado do viewport)
              ├── useEffect com wheel listener NÃO-passivo (fix)
              └── useEffect que chama onViewportChange quando visibleData muda
```

### Regra de zoom semântico

| Span atual (pontos visíveis) | Granularidade | Resultado |
|---|---|---|
| < 14 | day | Mantém day, bloqueia zoom-in < 7 |
| 14–59 | week | Muda automaticamente para week |  
| 60–90 | month | Muda automaticamente para month |
| > 90 | — | Bloqueia zoom-out, mantém 90 |

### onViewportChange callback

`ProjectedCashFlowChart` chama `onViewportChange(visibleData: ProjectedCashFlowPoint[])` sempre que `visibleData` mudar. O `ProvisoesTab` usa esse array para recalcular os KPI-cards em vez de usar `projectionData` completo.

---

## Dependências

- `ProjectedCashFlowPoint` (type já existe em `src/types/recurring.ts`)
- `useProjectedCashFlow` já existe em `src/hooks/useRecurringConfigs.ts`
- Sem novas dependências externas
