# Spec 004 — Fix DRE Data + Provisões Scroll-to-Zoom

## ID: 004-dre-provisoes-fix

---

## 1. Diagnóstico

### Problema 1: DRE não carrega dados

**Causa raiz confirmada via banco de dados:**
Existe um **conflito de overloading** da função PostgreSQL `get_dre_data`:
- `public.get_dre_data(p_year => integer)` — versão 1-arg (antiga)  
- `public.get_dre_data(p_year => integer, p_start_date => date, p_end_date => date)` — versão 3-args (nova)

O PostgREST **não consegue resolver qual versão chamar** quando só `p_year` é passado, retornando erro `PGRST203`.

Prova: quando testamos passando os 3 args (com `p_start_date: null, p_end_date: null`) o DRE retornou **9 linhas ricas** para 2026 (Receita de Comissões com jan=49k, fev=48k, mar=52k...).

**Fix:** O hook `useDreData` e o `financialService.getDreData()` precisam sempre chamar a versão **3-args** passando `null` para as datas quando não informadas.

---

### Problema 2: Provisões — Scroll faz a página rolar em vez de dar zoom no gráfico

**Causa raiz confirmada via código:**
O `ProjectedCashFlowChart.tsx` tem o handler `onWheel={handleWheel}` com `e.preventDefault()` mas isso **não funciona quando o listener é passivo por padrão no React**. O React 17+ registra listeners de `wheel` como **passivos**, o que impede que `preventDefault()` bloqueie o scroll nativo da página.

Resultado: o scroll do mouse rola a página em vez de fazer zoom no gráfico.

**Requisitos do usuário para o zoom:**
- Scroll pra cima (zoom-in): nível Mês → Semana → Dia (mínimo 7 dias na view)
- Scroll pra baixo (zoom-out): nível Dia → Semana → Mês (máximo 3 meses = 90 dias)
- Os **KPIs dos cards de resumo** (Receita Projetada, Despesa Projetada, Saldo Final) devem **atualizar em tempo real** refletindo apenas os pontos visíveis no viewport do gráfico — não o período total

---

## 2. O que JÁ EXISTE e será reutilizado

| Artefato | Local | Reutilização |
|---|---|---|
| `DreTable.tsx` | `src/components/financeiro/DreTable.tsx` | **Modificação mínima** no call do useDreData |
| `useDreData()` | `src/hooks/useFinanceiro.ts` L204 | Ajuste na assinatura para passar 3 args |
| `financialService.getDreData()` | `src/services/financialService.ts` | Ajuste para sempre usar versão 3-args |
| `ProjectedCashFlowChart.tsx` | `src/components/financeiro/ProjectedCashFlowChart.tsx` | Fix do wheel listener + KPIs reativos |
| `ProvisoesTab.tsx` | `src/components/financeiro/ProvisoesTab.tsx` | Recebe summary derivado do viewport (não do horizonte total) |

---

## 3. O que será CRIADO

Nada novo. Zero componentes novos, zero hooks novos, zero tabelas novas.  
São exclusivamente correções cirúrgicas em arquivos existentes.

---

## 4. Implementação detalhada

### Fix A: DRE — Hook e Service (2 mudanças)

**`financialService.getDreData(year?, startDate?, endDate?)`:**
- Sempre chamar `get_dre_data` com 3 parâmetros: `{ p_year, p_start_date: startDate ?? null, p_end_date: endDate ?? null }`

**`useFinanceiro.ts` — `useDreData(year?)`:**
- Já passa corretamente para o service, não precisa mudar (o service é que precisa mudar)

**`DreTable.tsx` L98:**
- Remover os `undefined, undefined` extras da chamada `useDreData(selectedYear, undefined, undefined)` que não aceita esses parâmetros hoje mesmo

### Fix B: Provisões — Zoom Semântico + KPIs Reativos (1 componente)

**`ProjectedCashFlowChart.tsx`:**

1. **Fix do `onWheel`**: Usar `useEffect` com `addEventListener` nativo (não-passivo) em vez de `onWheel` React para garantir que `e.preventDefault()` funcione e bloqueie o scroll da página.

2. **Zoom semântico por granularidade**: A lógica atual de zoom opera sobre `viewStart/viewEnd` (índice de pontos). Quando o span do viewport atingir certos thresholds, emitir callback `onGranularityChange`:
   - viewport span < 14 dias → sugerir/forçar `granularity = 'day'` (min 7 dias)
   - viewport span entre 14-60 dias → sugerir `granularity = 'week'`
   - viewport span > 60 dias → sugerir `granularity = 'month'` (max 90 dias = 3 meses)

3. **KPIs reativos ao viewport**: O `ProjectedCashFlowChart` deve receber uma prop `onViewportSummaryChange` (ou expor os dados via callback) com os totais dos pontos **visíveis**, e o `ProvisoesTab` deve usar esses valores nos cards de resumo em vez de calcular sobre o array completo.

---

## 5. Critérios de Aceite

- [ ] A aba DRE exibe dados 2026 populados (jan-abr com valores reais)
- [ ] O scroll/wheel sobre o gráfico de Provisões faz zoom, não rola a página
- [ ] Zoom-in máximo: mínimo 7 pontos visíveis
- [ ] Zoom-out máximo: máximo 90 pontos visíveis (≈ 3 meses em granularidade dia)
- [ ] Os 3 KPI-cards (Receita Projetada, Despesa Projetada, Saldo Final) refletem apenas o período visível no viewport
- [ ] A granularidade muda automaticamente ao fazer zoom (dia←→semana←→mês)
