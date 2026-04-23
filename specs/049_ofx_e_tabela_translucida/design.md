# Spec 049 — Design Document

## 1. Abordagem de Frontend (Antigravity)

### 1.1 Atualização de `BankTransactionsTable`
- **Tabela Translúcida**: 
  - Vamos remover efeitos pesados como `hover:bg-muted/50`, substituindo por tons mais próximos ao preto translúcido das tabelas premium (ex: `hover:bg-white/[0.02]`).
  - As bordas entre linhas não devem ter forte contraste (`border-border/20` ou border-white/5).

### 1.2 Atualização no `StatementImporter` (OFX Bug Fix)
- **Correção da string de Data**: 
  - Antes: parse do `DTPOSTED` para `new Date(year, month, day)`, sujeito a conversão timezone na hora do `toISOString()`.
  - Agora: extrassão rigorosa manual: 
    ```javascript
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    // transaction_date = `${year}-${month}-${day}`
    ```
  - Isso garante que "20260102" sempre vire "2026-01-02", independente de quem roda ou da hora registrada no arquivo.

### 1.3 Suporte à Árvore DRE na Adição de Categorias
- **Comboboxes / Modais**:
  - Validaremos que as funções de criação/adição de despesas exibem corretamente a hierarquia (DRE). Se for em `TransactionDetailsSheet` (para edição/categorização), garantiremos que o select ali também use a versão achatada (`flattened`) com a marcação visual de "pai/filho" simulando uma árvore.

## 2. Abordagem de Backend / DB
- Não há migrações no banco.
- O dado de `transaction_date` já é DATE no banco, o problema era puramente via parser no frontend (StatementImporter).

## 3. Onde o Código Será Modificado
1. `src/components/financeiro/bancos/BankTransactionsTable.tsx`
2. `src/features/finance/components/reconciliation/StatementImporter.tsx`
3. A conferir: `src/components/financeiro/TransactionDetailsSheet.tsx` e `src/features/finance/components/reconciliation/PartialReconciliationModal.tsx` ou afins.
