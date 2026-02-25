

# Upgrade da Tela de Relatorios e Exportacao

## Visao Geral

Modernizacao completa da tela de Relatorios em 5 fases: correcao critica do modal de exportacao, padronizacao visual Glass/AppCard, toggle Projecao vs Conciliado, novos graficos de insight, e sincronizacao do PDF.

---

## FASE A: Correcao Critica do Modal + Sincronizacao de Filtros

**Problema:** O `ExportManagementModal.tsx` ignora os filtros ativos da tela (linhas 68-74 passam arrays vazios para `seguradoraIds`, `ramos`, etc.).

**Solucao:**

1. **`ExportManagementModal.tsx`**: Receber `filtrosGlobais` completos como prop (alem de `initialDateRange`). Usar esses filtros como estado inicial do modal.
2. Adicionar dentro do modal seletores rapidos de **Seguradora**, **Ramo** e o novo toggle **Visao de Dados** (Projecao Total vs Apenas Conciliado).
3. O hook `useFilteredDataForReports` interno do modal passara a usar esses filtros sincronizados em vez de arrays vazios.

**Arquivos alterados:**
- `src/components/reports/ExportManagementModal.tsx`
- `src/pages/Reports.tsx` (passar `filtrosGlobais` como prop ao modal)

---

## FASE B: Padronizacao Visual Glass/AppCard

**Problema:** `VisaoGeralCarteira.tsx` usa `GlassCard` com `bg-slate-800` hardcoded nos cards internos. `RelatorioFaturamento.tsx` usa `AppCard` mas tambem tem `bg-slate-800` hardcoded. Ambos incompativeis com Light Mode.

**Solucao:**

1. **`VisaoGeralCarteira.tsx`**: Trocar `GlassCard` por `AppCard`. Substituir todas as classes `bg-slate-800` por `bg-card`, `text-slate-400` por `text-muted-foreground`, `text-slate-500` por `text-muted-foreground`, `border-slate-700` por `border-border`.
2. **`RelatorioFaturamento.tsx`**: Mesma migracao de cores hardcoded para tokens semanticos (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`).
3. **Carousel para Grid/Tabs**: Substituir o bloco `<Carousel>` de "Analises Avancadas" em `Reports.tsx` por um layout em Grid responsivo (3 colunas no desktop), eliminando a necessidade de deslizar.

**Arquivos alterados:**
- `src/components/reports/VisaoGeralCarteira.tsx`
- `src/components/reports/RelatorioFaturamento.tsx`
- `src/pages/Reports.tsx`

---

## FASE C: Toggle "Projecao vs Caixa Conciliado"

**Problema:** Nao existe distincao entre comissao projetada (% sobre premio) e comissao efetivamente recebida (transacoes conciliadas).

**Solucao:**

1. **`FiltrosAvancados.tsx`**: Adicionar um `ToggleSwitch` com label "Apenas Caixa Conciliado" no topo dos filtros. Quando ativado, sinaliza que apenas transacoes com `reconciled = true` devem ser consideradas.
2. **Expandir `FiltrosGlobais`**: Adicionar campo `onlyConciled: boolean` (default: `false`).
3. **`useFilteredDataForReports.ts`**: Quando `onlyConciled = true`, filtrar `transacoesFiltradas` para incluir apenas as que possuem `reconciled = true`. Os KPIs financeiros (totalGanhos, totalPerdas, saldoLiquido) ja derivam dessas transacoes, entao a filtragem se propaga automaticamente.
4. **`useSupabaseReports.ts`**: Quando `onlyConciled = true`, adicionar `.eq('reconciled', true)` na query de transacoes.

**Arquivos alterados:**
- `src/components/reports/FiltrosAvancados.tsx`
- `src/hooks/useFilteredDataForReports.ts`
- `src/hooks/useSupabaseReports.ts`
- `src/pages/Reports.tsx` (estado inicial do toggle)

---

## FASE D: Novos Componentes Visuais

Criar componentes leves posicionados no lugar do carousel removido:

1. **`AdimplenciaDonut.tsx`**: Grafico Donut (Recharts PieChart) mostrando "Comissao Projetada vs Comissao Recebida". Dados derivados: projecao = soma(premio * taxa_comissao) das apolices; realizado = soma(transacoes RECEITA com reconciled=true).
2. **`DreCompactoBar.tsx`**: BarChart comparativo com 3 barras - Comissao Projetada (azul), Comissao Realizada (verde), Despesas (vermelho). Usa dados ja disponiveis no hook.
3. **`AlertaAtrasoFinanceiro.tsx`**: Widget simples (AppCard) listando total de comissoes com vigencia ativada (start_date no passado) mas sem transacao PAGO/REALIZADO correspondente.

**Arquivos criados:**
- `src/components/reports/AdimplenciaDonut.tsx`
- `src/components/reports/DreCompactoBar.tsx`
- `src/components/reports/AlertaAtrasoFinanceiro.tsx`

**Arquivos alterados:**
- `src/pages/Reports.tsx` (importar e posicionar os novos componentes)

---

## FASE E: PDF Gerencial Sincronizado

1. **`generateManagementReport.ts`**: Adicionar campo `dataVision: 'projection' | 'reconciled'` ao `ReportOptions`. Estampar no cabecalho/rodape "Visao: Projecao Total" ou "Visao: Caixa Conciliado". Os valores financeiros ja virao filtrados do hook.
2. **`ExportManagementModal.tsx`**: Passar a flag `dataVision` para o gerador de PDF baseado no toggle do modal.

**Arquivos alterados:**
- `src/utils/pdf/generateManagementReport.ts`
- `src/components/reports/ExportManagementModal.tsx`

---

## Detalhes Tecnicos

| Aspecto | Decisao |
|---------|---------|
| Grafico Donut | Recharts `PieChart` com `innerRadius` para efeito donut |
| Estilo charts | Seguir memory: eixos com `hsl(var(--muted-foreground))`, grid com `hsl(var(--border))` |
| Toggle Switch | Reutilizar componente existente `src/components/ui/toggle-switch.tsx` |
| Carousel removal | Grid `grid-cols-1 lg:grid-cols-3` responsivo |
| Reconciled filter | Campo `reconciled` na tabela `transactions` (ja existe) |
| Sem migration SQL | Nenhuma alteracao de banco necessaria |
| Performance | Filtragem de reconciled feita na query SQL (backend), nao no frontend |

## Ordem de Execucao

1. Fase A (critica) - Modal + filtros sincronizados
2. Fase C - Toggle Conciliado (depende de Fase A para o modal)
3. Fase B - Visual Glass/AppCard
4. Fase D - Novos graficos
5. Fase E - PDF atualizado

