

# Plano: Fix build error + RLS ao salvar clientes

## Problemas encontrados

### 1. Build error: `src/types/database.types.ts` corrompido
O arquivo contém lixo binário (caracteres inválidos). Nenhum arquivo no projeto importa esse arquivo, então basta deletá-lo.

### 2. RLS error ao salvar clientes (causa raiz)
No `useGenericSupabaseMutation.ts` linha 28, o `user_id` é passado como `user_id`:
```typescript
mapDataToSupabase(tableName, { ...data, user_id: user.id })
```

Porém, o `mapClientToSupabase` em `dataMappers.ts` usa um whitelist que só aceita `userId` (camelCase) como chave para mapear para `user_id`. Como a chave `user_id` não está no whitelist, ela é **descartada silenciosamente**.

Resultado: o INSERT no Supabase vai sem `user_id`, e a policy RLS (`auth.uid() = user_id`) rejeita o registro.

## Correções

### 1. Deletar `src/types/database.types.ts`
Arquivo corrompido, sem nenhum import — pode ser removido com segurança.

### 2. Corrigir o whitelist no `mapClientToSupabase` (`src/utils/dataMappers.ts`)
Adicionar `user_id: 'user_id'` ao `fieldMappings` para que a chave snake_case também seja aceita:

```typescript
const fieldMappings: Record<string, string> = {
  // ... campos existentes ...
  userId: 'user_id',
  user_id: 'user_id',  // aceitar ambos os formatos
};
```

Fazer o mesmo no `mapPolicyToSupabase` para consistência (adicionar `user_id: 'user_id'`).

### 3. Remover filtro de valores vazios para campos opcionais
Na linha 153, `email` e `phone` vazios são filtrados (`value !== ''`), mas a tabela `clientes` tem `phone` e `email` como NOT NULL. Se o formulário rápido envia um deles vazio, o INSERT falha. Ajustar para que `email` e `phone` passem string vazia quando não preenchidos, ou garantir que o default do formulário preencha pelo menos um.

## Arquivos alterados
- Deletar: `src/types/database.types.ts`
- Editar: `src/utils/dataMappers.ts` — adicionar `user_id` ao whitelist dos mappers

## Resultado
- Build volta a funcionar (sem arquivo corrompido)
- Clientes são salvos com `user_id` correto, passando a policy RLS

