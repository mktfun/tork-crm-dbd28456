

# Plano: Barra de Filtros Avançados de Datas para Apólices

## O que será criado

Um novo componente **dumb** `PolicyDateFilterBar` que ficará entre os KPIs e a barra de busca existente na página `Policies.tsx`. Ele contém:

1. **DatePickerWithRange** (componente existente) para selecionar período
2. **Select "Tipo de Período"** com 3 opções: `Data de Cadastro`, `Início da Vigência`, `Fim da Vigência`
3. **Botões de atalho rápido**: `Este Mês`, `Mês Passado`, `Próximos 30 dias`, `Próximos 90 dias` — ao clicar, preenchem o DatePicker automaticamente

## Arquivo novo

### `src/components/policies/PolicyDateFilterBar.tsx`

Componente puro com props:

```ts
interface PolicyDateFilterBarProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  periodType: 'created_at' | 'start_date' | 'expiration_date';
  onPeriodTypeChange: (type: string) => void;
}
```

- Estado local apenas para controle visual (qual atalho está "ativo")
- Layout: uma linha horizontal com `DatePickerWithRange` à esquerda, Select de tipo ao lado, e os 4 botões de atalho como chips/badges clicáveis
- Os atalhos calculam `{ from, to }` usando `date-fns` (startOfMonth, endOfMonth, addDays, subMonths) e chamam `onDateRangeChange`
- Um botão "Limpar" aparece quando há range selecionado
- Design: classes `bg-card border-border` consistentes com o sistema existente

## Arquivo modificado

### `src/pages/Policies.tsx`

- Adicionar dois novos `useState`: `dateRange` (`DateRange | undefined`) e `periodType` (`string`, default `'expiration_date'`)
- Renderizar `<PolicyDateFilterBar>` entre o bloco de KPIs (linha 350) e o header "Apólices" (linha 353)
- O callback `onDateRangeChange` apenas atualiza o estado local — **não** modifica `filters` nem chama Supabase
- O callback `onPeriodTypeChange` apenas atualiza o estado local

**Nenhuma alteração** em `useFilteredPolicies`, `useSupabasePoliciesPaginated`, ou qualquer hook/API.

