

# Plano: Corrigir criação e edição de clientes

## Problemas identificados

### 1. MaskedInput incompatível com React 18 + react-hook-form
O `react-input-mask` usa um pattern `children-as-function` que conflita com React 18. Quando o `react-hook-form` passa `{...field}` (que inclui `ref`, `onChange`, `value`), o `InputMask` tenta gerenciar esses mesmos props internamente, causando inputs que não respondem ou comportam erraticamente.

### 2. Edição no ClientDetails envia campos inválidos ao Supabase
O `handleSaveChanges` faz `updateClient({ id: client.id, ...editedClient })`. O `editedClient` é o objeto `Client` completo, que contém campos como `createdAt`, `ai_enabled`, `id` (duplicado). O `mapClientToSupabase` usa fallback `fieldMappings[key] || key` — campos não mapeados (como `createdAt`, `ai_enabled`) passam direto com nomes camelCase, causando erro no Supabase (colunas não existem).

### 3. Validação CPF/submit sem validação formal
O `onSubmit` do `NewClientModal` chama `form.getValues()` diretamente sem `form.handleSubmit()`, então a validação do Zod nunca roda. Campos inválidos passam sem erro visível.

## Mudanças

### 1. Substituir `react-input-mask` por input com formatação manual
Reescrever `MaskedInput` para não depender de `react-input-mask`. Usar formatação manual nos campos CPF, CNPJ e telefone com `onChange` que aplica máscara programaticamente. Isso elimina a incompatibilidade com React 18.

### 2. Filtrar campos no `mapClientToSupabase`
Mudar o mapper para só incluir campos conhecidos (whitelist), ignorando qualquer campo que não esteja no `fieldMappings`. Isso previne enviar `createdAt`, `ai_enabled`, `id` etc. ao Supabase.

```
// ANTES (passa campos desconhecidos):
const mappedKey = fieldMappings[key] || key;

// DEPOIS (ignora campos desconhecidos):
if (!(key in fieldMappings)) return;
const mappedKey = fieldMappings[key];
```

### 3. Corrigir submit do NewClientModal
Usar `form.handleSubmit(onSubmit)` no botão Salvar para que a validação Zod rode antes do submit. Atualmente `onSubmit` é chamado diretamente sem validação.

### 4. Corrigir edição no ClientDetails
Filtrar o `editedClient` antes de enviar ao `updateClient`, removendo campos read-only (`id`, `createdAt`).

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/ui/masked-input.tsx` | Reescrever sem `react-input-mask` |
| `src/utils/dataMappers.ts` | Whitelist de campos no mapper |
| `src/components/clients/NewClientModal.tsx` | Usar `handleSubmit` do react-hook-form |
| `src/pages/ClientDetails.tsx` | Filtrar campos antes do update |
| `src/components/clients/ClientPersonalInfo.tsx` | Adaptar ao novo MaskedInput |
| `src/components/clients/form-tabs/PersonalDataTab.tsx` | Adaptar ao novo MaskedInput |

