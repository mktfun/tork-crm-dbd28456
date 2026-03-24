

# Plano: Corrigir exibição de transações no Detalhes

## Problemas identificados

1. **Dois movimentos contábeis aparecendo** — o sistema de partidas dobradas mostra "Outras Receitas" + "Contas a Receber" para toda transação. O usuário quer ver UM movimento simplificado: "Entrada no banco" ou "Saída do banco"
2. **Header de despesa aparece verde/positivo** — linha 268 hardcoda `text-emerald-500` e `bg-emerald-500` para TODAS as transações, mesmo despesas
3. **Origem crua** — mostra `manual` ou `bank_statement` como texto técnico

## Mudanças

### `TransactionDetailsSheet.tsx`

**A. Determinar tipo da transação (receita vs despesa)**
- Derivar `isExpenseTransaction` a partir dos `ledgerEntries`: se existe entry com `accountType === 'expense'`, é despesa
- Alternativa: se o `amount` do entry de tipo `asset` é negativo, é saída

**B. Header dinâmico (valor + cor)**
- Linha 268: trocar gradiente fixo emerald por condicional:
  - Receita: `from-emerald-500/10`, `text-emerald-500`
  - Despesa: `from-red-500/10`, `text-red-500`, valor com prefixo `-`

**C. Simplificar "Movimentos Contábeis" para visão de caixa**
- Substituir a listagem de TODOS os ledger entries por uma visão simplificada:
  - **Uma linha só**: "Receita Bancária" ou "Despesa Bancária" com valor e cor correta
  - Abaixo, mostrar a conta de origem/destino (ex: "Outras Receitas", "Fornecedores")
- Opcionalmente manter um toggle "Ver partidas dobradas" para quem quiser o detalhe contábil

**D. Origem amigável**
- Linha 536: mapear `relatedEntityType`:
  - `bank_statement` → "Extrato Bancário (Conciliação)"
  - `manual` / null → "Lançamento Manual"
  - `policy` → "Comissão de Apólice"
  - `legacy_transaction` → "Migração"
  - `reversal` → "Estorno"

## Arquivos

| Arquivo | Ação |
|---|---|
| `TransactionDetailsSheet.tsx` | Cor dinâmica no header, simplificar movimentos, origem amigável |

