

# Plano: Limpar Clientes de Teste e Dados Relacionados

## Dados encontrados

5 clientes de teste + 1 deal vinculado + 1 follow-up + 2 deal events.

## Ordem de exclusão (respeitando dependências)

Executar via migration/insert tool na seguinte ordem:

### 1. Deletar follow-up
```sql
DELETE FROM ai_follow_ups WHERE deal_id = 'f78723c2-10db-4d27-824a-4f74b7bca98a';
```

### 2. Deletar deal events
```sql
DELETE FROM crm_deal_events WHERE deal_id = 'f78723c2-10db-4d27-824a-4f74b7bca98a';
```

### 3. Deletar deal
```sql
DELETE FROM crm_deals WHERE id = 'f78723c2-10db-4d27-824a-4f74b7bca98a';
```

### 4. Deletar os 5 clientes
```sql
DELETE FROM clientes WHERE id IN (
  '9ddf2cb8-bc71-42e7-afa5-e48e617cff83',
  '94d2eb3b-90fa-41f8-a999-387c2f297790',
  'e26e5a1c-b05f-40a6-baf5-3b552226988c',
  '87a09688-f433-4337-bd82-58b74240a872',
  '9e20213c-bc48-4e1a-a440-01b5bec0a17e'
);
```

## Registros removidos

| Tabela | Quantidade |
|---|---|
| ai_follow_ups | 1 |
| crm_deal_events | 2 |
| crm_deals | 1 |
| clientes | 5 (Teste Cenario2b, Teste Cenario2, Teste Cenario1, jj, Davi) |

