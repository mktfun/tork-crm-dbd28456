

# Corrigir status padrão e atualizar orçamentos existentes

## Problema
O formulário de nova apólice vem com status "Orçamento" pré-selecionado (linha 135 de `PolicyFormModal.tsx`). O estagiário está criando apólices sem mudar o status, resultando em registros "Orçamento" que deveriam ser "Ativa".

## Alterações

### 1. Mudar default de "Orçamento" para "Ativa" no formulário
**Arquivo:** `src/components/policies/PolicyFormModal.tsx` (linha 135)
- Trocar `status: 'Orçamento'` para `status: 'Ativa'`

### 2. Atualizar os 8 orçamentos existentes para "Ativa"
Executar via SQL (insert tool) um UPDATE nos registros com status "Orçamento":
```sql
UPDATE apolices 
SET status = 'Ativa', updated_at = now()
WHERE status = 'Orçamento';
```
IDs afetados (da query anterior):
- `5be5853f`, `665c6a43`, `c85d4e94`, `ff652cc0`, `b5626914`, `4112ca2e`, `d631c96c`, `99a016ca`

