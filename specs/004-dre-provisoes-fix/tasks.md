# Tasks: 004-dre-provisoes-fix

## Fix A: DRE

- [ ] **A1** — `financialService.ts`: localizar `getDreData`, alterar chamada RPC para sempre passar `{ p_year, p_start_date: startDate ?? null, p_end_date: endDate ?? null }`
- [ ] **A2** — `DreTable.tsx` L98: corrigir chamada `useDreData(selectedYear, undefined, undefined)` para `useDreData(selectedYear)`
- [ ] **A3** — Validar: rodar o DRE no browser e confirmar que aparecem os dados de 2026

## Fix B: Provisões Zoom + KPIs reativos

- [ ] **B1** — `ProjectedCashFlowChart.tsx`: substituir `onWheel={handleWheel}` por `useEffect` com `containerRef.current.addEventListener('wheel', handler, { passive: false })` para garantir que `preventDefault()` bloqueie o scroll nativo
- [ ] **B2** — `ProjectedCashFlowChart.tsx`: adicionar prop `onGranularityChange?: (g: GranularityOption) => void` e implementar lógica que detecta threshold de span e chama o callback automaticamente
- [ ] **B3** — `ProjectedCashFlowChart.tsx`: adicionar prop `onViewportChange?: (visibleData: ProjectedCashFlowPoint[]) => void` e chamar via `useEffect` sempre que `visibleData` mudar
- [ ] **B4** — `ProvisoesTab.tsx`: conectar `onGranularityChange` para atualizar o state `granularity` quando zoom mudar automaticamente
- [ ] **B5** — `ProvisoesTab.tsx`: adicionar state `viewportSummary` e conectar `onViewportChange` para recalcular KPI-cards a partir do viewport visível (não do array total)
- [ ] **B6** — Validar: testar scroll sobre o gráfico, confirmar zoom funciona sem rolar página
- [ ] **B7** — Validar: confirmar que KPIs mudam ao fazer zoom/pan no gráfico

## Deploy

- [ ] **D1** — `npm run build` sem erros
- [ ] **D2** — `git push origin master` + `git push lovable master:master`
