# Checklist: Fix Admin Routing do Rodrigo

- [x] **1. Migração Limpeza de Dados:**
  - Rodar o comando CLI `supabase migration new clear_rodrigo_client`
  - Incluir query de remoção do número dele na tabela `clientes`.
- [x] **2. Refatorar Telefone (9º Dígito Móvel) em `resolveContext.ts`:**
  - Extrair lógica que garante o stripping unicamente do 9º Dígito extra antes do teste da propriedade `.find()`, mantendo 10 dígitos estritos finais limitados às comparações dentro da mesma corretora.  
- [x] **3. Fallback de Tenant com `account_id`:**
  - Em `resolveContext.ts` logo após a varredura nula do Inbox Mapping, adicionar fallback consultando `supabase.from('brokerages').select('id, user_id').eq('chatwoot_account_id', body.account?.id || body.account_id)`. Se sucesso, mapear paramêtro `brokerageId` que garante a etapa posterior.
- [x] **4. Build de Teste e Validação:**
  - Verificar lint errors.  
