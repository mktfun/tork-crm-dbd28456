# Proposta de Design: Gráfico de Evolução do Saldo

## Visão Geral
Adicionar um gráfico de área para visualizar a evolução do saldo bancário ao longo do tempo (diário), permitindo ao usuário entender tendências de fluxo de caixa rapidamente.

## Componente Proposto: `BalanceEvolutionChart`

### Biblioteca
- **Recharts** (já utilizada no projeto).
- Tipo: `AreaChart` (para enfatizar o volume acumulado).

### Visualização
- **Eixo X:** Datas (Dinâmico: dias para períodos curtos, meses para períodos longos).
- **Eixo Y:** Valores monetários (R$).
- **Granularidade:** 
  - **Dias:** Para intervalos curtos (ex: mês atual ou até 60 dias).
  - **Meses:** Para intervalos longos (ex: ano todo), agrupando o saldo final de cada mês.
- **Linha/Área:** 
  - Cor primária (verde/emerald se positivo, vermelho se negativo? Ou sempre primary theme color).
  - Gradiente (fade out) abaixo da linha.
- **Tooltip:** 
  - Mostra: Data, Saldo Final do dia, Variação (Receitas - Despesas).

### Mockup Funcional (Mermaid)

```mermaid
graph TD
    A[Usuário Seleciona Banco/Período] -->|Parâmetros| B(Componente: BalanceEvolutionChart)
    B -->|Hook: useBankBalanceHistory| C{Busca Dados}
    C -->|RPC: get_daily_balances| D[(Banco de Dados)]
    D -->|Retorna: { data, saldo, receitas, despesas }| B
    B -->|Renderiza| E[AreaChart Recharts]
    
    subgraph UI Display
    E -- Hover --> F[Tooltip: R$ 5.000,00 (+ R$ 200,00)]
    end
```

## Dados Necessários (Backend)

Nova função RPC: `get_daily_balances(p_bank_account_id, p_start_date, p_end_date)`

Retorno JSON:
```json
[
  { "date": "2026-02-01", "balance": 4500.00, "income": 1000.00, "expense": 200.00 },
  { "date": "2026-02-02", "balance": 5300.00, "income": 0.00, "expense": 0.00 },
  ...
]
```

## Implementação Futura

1.  **Backend:** Criar a função `get_daily_balances` que calcula o saldo "retroativo" dia a dia (partindo do saldo atual e subtraindo transações, ou somando desde o início).
2.  **Frontend:** Criar componente `BalanceEvolutionChart.tsx`.
3.  **Integração:** Adicionar ao `BankHistorySheet.tsx` (topo) e `BankDashboardView.tsx`.
