

# Plano: Corrigir detecção admin + Limpar RAG do dispatcher

## Problema 1: Admin não detectado por telefone

O sender phone do Chatwoot vem como `+5511996242812`. Após `replace(/\D/g, '')` fica `5511996242812`.

O telefone do produtor no banco é `11996242812` (sem código de país).

A query faz:
```sql
ilike phone '%5511996242812%'
```

Isso procura a string **maior** dentro da **menor** — nunca vai dar match. O `ilike '%5511996242812%'` verifica se `11996242812` **contém** `5511996242812`, mas é o contrário.

**Correção**: Inverter a lógica — verificar se o `senderPhone` **contém** o telefone do banco. Ou melhor, normalizar removendo o prefixo `55` do país:

```typescript
const senderPhone = sender?.phone_number?.replace(/\D/g, '')
const normalizedPhone = senderPhone?.startsWith('55') ? senderPhone.slice(2) : senderPhone
```

E usar `normalizedPhone` nas queries de producer e brokerage. Mesma normalização deve ser aplicada na resolução do cliente (step 4).

## Problema 2: RAG quebrado no dispatcher (remover)

Conforme definido, o RAG deve viver no n8n, não no dispatcher. A função `fetchKnowledgeContext` está quebrada (parâmetros errados) e deve ser removida.

**Mudanças no `buildPrompt.ts`**:
- Deletar `fetchKnowledgeContext` (linhas 4-15)
- Remover chamada no bloco admin (linha ~72): `knowledgeContext = await fetchKnowledgeContext(...)`
- Remover injeção `<knowledge_base>` no prompt admin (linha ~79)
- Adicionar `'rag_search'` nos `allowedTools` do admin
- Atualizar `<capabilities>` do admin para referenciar RAG como ferramenta

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `resolveContext.ts` | Normalizar telefone removendo prefixo `55` antes de comparar com producers/brokerages/clientes |
| `buildPrompt.ts` | Remover `fetchKnowledgeContext`, remover injeção de knowledge_base, adicionar `rag_search` nos allowedTools |

## Resultado esperado

- Número `+5511996242812` → normalizado `11996242812` → match com producer → `👑 admin mode`
- RAG removido do dispatcher, sinalizado como tool para o n8n executar

