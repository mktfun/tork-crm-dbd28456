

# Corrigir Solicitacoes nao aparecendo no Portal do Cliente

## Problema

A pagina `PortalSolicitacoes.tsx` faz uma query direta na tabela `portal_requests` filtrando por `client_id`. Porem, o usuario do portal e **anonimo** (nao autenticado no Supabase Auth). A politica RLS de SELECT exige `clientes.user_id = auth.uid()`, que retorna `null` para usuarios anonimos, bloqueando todas as linhas.

A insercao funciona porque usa a RPC `insert_portal_request` com `SECURITY DEFINER`, que ignora RLS. Mas a leitura nao tem esse mecanismo.

## Solucao

### 1. Criar RPC `get_portal_requests_by_client` (Migration SQL)

Criar uma funcao `SECURITY DEFINER` que recebe `p_client_id UUID` e `p_brokerage_user_id UUID`, valida que o cliente pertence a corretora, e retorna as solicitacoes.

```sql
CREATE OR REPLACE FUNCTION get_portal_requests_by_client(
  p_client_id UUID,
  p_brokerage_user_id UUID
)
RETURNS TABLE (
  id UUID,
  request_type TEXT,
  insurance_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  is_qualified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que o cliente pertence a esta corretora
  IF NOT EXISTS (
    SELECT 1 FROM clientes
    WHERE clientes.id = p_client_id
      AND clientes.user_id = p_brokerage_user_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pr.id, pr.request_type, pr.insurance_type,
         pr.status, pr.created_at, pr.is_qualified
  FROM portal_requests pr
  WHERE pr.client_id = p_client_id
  ORDER BY pr.created_at DESC;
END;
$$;
```

### 2. Atualizar `PortalSolicitacoes.tsx`

Trocar a query direta `.from('portal_requests').select(...)` pela chamada RPC:

```typescript
const client = JSON.parse(clientData);
const brokerage = JSON.parse(sessionStorage.getItem('portal_brokerage'));

const { data, error } = await supabase.rpc('get_portal_requests_by_client', {
  p_client_id: client.id,
  p_brokerage_user_id: brokerage.user_id,
});
```

### Resumo Tecnico

| Item | Detalhe |
|------|---------|
| Causa raiz | RLS bloqueia SELECT para usuarios anonimos |
| Padrao existente | Mesmo padrao usado por `get_portal_cards_hybrid` e `insert_portal_request` |
| Arquivos alterados | 1 migration SQL + `PortalSolicitacoes.tsx` |
| Risco | Zero - nao altera logica existente, apenas adiciona RPC e muda a fonte de dados |

