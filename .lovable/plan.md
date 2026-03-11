

# Fix: Seguradora mostrando 16k fantasma + entity_name sem "Dono + Item"

## Diagnóstico

1. **16k fantasma no gráfico de Seguradoras**: O hook `useReceivablesBySeguradora` consulta `financial_transactions` **sem filtrar `archived`**. Como todas as 937 transações foram arquivadas mas o hook não filtra, ele continua somando dados antigos. Os RPCs (`get_upcoming_receivables`, `get_payable_receivable_transactions`) já filtram `archived = false` e por isso retornam 0 corretamente.

2. **"undefined" nos nomes**: As transações legadas têm `related_entity_type = 'legacy_transaction'` apontando para a tabela `transactions` (não `apolices`), e os JOINs com `apolices` falham. Descrições gravadas como "Comissão da apólice undefined".

3. **Formato do nome**: O usuário quer ver **"Nome do Cliente - Item Segurado"** (ex: "João Silva - Fiat Uno ABC-1234"). Atualmente as RPCs mostram só o nome do cliente.

## Correções

### 1. Hook `useReceivablesBySeguradora` — adicionar filtro `archived`
Em `src/hooks/useFinanceiro.ts` (linha ~913), adicionar `.eq('archived', false)` na query.

### 2. RPCs — entity_name com "Cliente - Item"
Migration SQL para atualizar `get_upcoming_receivables` e `get_payable_receivable_transactions`:
- Adicionar `a.insured_asset` no SELECT
- Mudar o COALESCE do entity_name para concatenar: `client_name || ' - ' || insured_asset` quando ambos existem

```sql
-- Exemplo do padrão:
COALESCE(
  CASE WHEN c_apolice.name IS NOT NULL AND a.insured_asset IS NOT NULL 
       THEN c_apolice.name || ' - ' || a.insured_asset
       WHEN c_apolice.name IS NOT NULL THEN c_apolice.name
       ELSE NULL END,
  c_trans.name,
  comp.name,
  'Não especificado'
)::TEXT as entity_name
```

### 3. Nenhuma mudança de dados
Tudo já está arquivado corretamente. As 51 pendentes legadas são lixo ("undefined") e devem permanecer arquivadas. Quando novas apólices emitirem comissões via `register_policy_commission`, elas criarão `related_entity_type = 'policy'` com `archived = false` e aparecerão corretamente.

## Entregas
- **1 edit frontend**: Filtro `archived` no hook `useReceivablesBySeguradora`
- **1 migration SQL**: RPCs com entity_name = "Cliente - Item Segurado"

