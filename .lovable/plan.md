

# Plano: Corrigir erro de build — Fragment JSX faltando

## Problema

`KanbanBoard.tsx` linha 542 tem `</>` (fechamento de fragment), mas não existe `<>` (abertura de fragment) correspondente. O `return` na linha 393 abre com `<div>` diretamente, mas depois na linha 519 existem modais como irmãos desse div, exigindo um fragment wrapper.

## Correção

Adicionar `<>` na linha 394 (antes do `<div>`) para abrir o fragment que fecha na linha 542.

| Arquivo | Ação |
|---|---|
| `src/components/crm/KanbanBoard.tsx` | Adicionar `<>` após `return (` na linha 393-394 |

