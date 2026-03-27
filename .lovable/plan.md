

# Plano: Fix FIFO parcial que some com recebíveis

## Problema

Ao conciliar 2 entradas de extrato (R$200 cada) contra 1 recebível de R$800 da Sura:

1. **1ª chamada** (R$200): Encontra o recebível de R$800, aplica R$200 → `paid_amount=200`, `status='partial'`, **atribui `bank_account_id`**
2. **2ª chamada** (R$200): O filtro na linha 205 tem `AND bank_account_id IS NULL`. Como a 1ª chamada já atribuiu o banco, o recebível **não aparece mais**. A RPC retorna `reconciled_count=0` silenciosamente, mas marca o extrato como "matched" mesmo sem conciliar nada.
3. **Resultado**: Recebível fica com R$200 pago de R$800, mas desaparece da tela consolidada. O extrato fica falsamente marcado como conciliado.

## Causa raiz (SQL)

```sql
-- Linha 205 da RPC reconcile_insurance_aggregate_fifo:
AND bank_account_id IS NULL  -- ❌ Exclui parciais que já receberam banco
```

## Mudança

### Migration SQL — recriar `reconcile_insurance_aggregate_fifo`

Duas alterações:

1. **Filtro do FOR loop**: trocar `AND bank_account_id IS NULL` por:
```sql
AND (bank_account_id IS NULL OR bank_account_id = v_final_bank_id)
AND is_reconciled = false
```
Isso permite que a 2ª chamada encontre o mesmo recebível parcialmente pago (já atribuído ao mesmo banco).

2. **Guard contra falso "matched"**: antes de atualizar `bank_statement_entries`, verificar:
```sql
IF v_reconciled_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhum recebível pendente encontrado para esta seguradora.');
END IF;
```
Impede que entradas de extrato sejam marcadas como conciliadas sem ter processado nada.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| Nova migration SQL | Recriar `reconcile_insurance_aggregate_fifo` com filtro corrigido e guard |

## Resultado

- Múltiplas entradas de extrato podem dar baixa parcial no mesmo recebível
- Recebível permanece visível até ser totalmente pago (`is_reconciled = true`)
- Entradas de extrato não são falsamente marcadas como conciliadas quando nada foi processado

