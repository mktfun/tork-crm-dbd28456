

# Limpar último batch e corrigir layout do histórico

## Etapa 1 — Deletar dados restantes

Usar a ferramenta de inserção/deleção SQL para executar:
- `UPDATE financial_transactions SET reconciled_statement_id = NULL` onde o statement pertence ao batch `8eb8b8e7`
- `DELETE FROM bank_statement_entries WHERE import_batch_id = '8eb8b8e7-...'`
- `DELETE FROM bank_import_history WHERE id = '8eb8b8e7-...'`

## Etapa 2 — Melhorar layout do card de histórico

**Arquivo:** `src/features/finance/components/reconciliation/ReconciliationPage.tsx`

### Card do histórico (linhas ~627-686)
- Separar o valor total do bloco de metadados — colocá-lo à direita como destaque, alinhado com o botão "Ver Detalhes"
- Mover o valor para fora do `div` de texto corrido e dar `whitespace-nowrap` + `font-semibold`
- Aumentar o espaçamento vertical entre a linha de data/badges e a linha de arquivo/auditor

### Modal de detalhes do batch (linhas ~1140-1156)
- Trocar `truncate` por `line-clamp-2` na descrição para evitar corte total
- Adicionar `whitespace-nowrap` e `min-w-[80px] text-right` no valor monetário para garantir alinhamento
- Aumentar padding de `p-2.5` para `p-3` nos itens

