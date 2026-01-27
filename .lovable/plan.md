
# Plano: Correção do Bug de Nome do Cliente na Importação

## Diagnóstico

O sistema está vinculando corretamente por CPF/CNPJ, mas exibe o nome lixo do OCR ("Ra Jj") em vez do nome do banco porque:

| Etapa | Código | Problema |
|-------|--------|----------|
| 1. Upsert | Linha 532-543 | `upsertResult.name` é retornado corretamente mas **IGNORADO** |
| 2. BulkPolicy | Linha 548 | `nome_cliente: parsed.nome_cliente` usa nome OCR lixo |
| 3. Reconcile | Linha 647 | `clientResult.clientName` tem nome correto, mas é tarde demais |
| 4. Item | Linha 661 | `clientNameToUse` pega nome do banco, mas `policy.nome_cliente` já está errado |

O nome correto está disponível em `upsertResult.name` desde a linha 540, mas nunca é aproveitado!

---

## Correção

Modificar o fluxo para usar o nome do banco quando disponível:

**Arquivo**: `src/components/policies/ImportPoliciesModal.tsx`

### Mudança 1: Capturar nome do upsert (linhas 529-545)

```typescript
// 6. Se tem documento válido, faz upsert automático de cliente
let autoClientId: string | undefined;
let autoClientName: string | undefined;  // ← NOVO: Captura nome do banco

if (parsed.cpf_cnpj) {
  const upsertResult = await upsertClientByDocument(
    parsed.cpf_cnpj,
    parsed.nome_cliente || 'Cliente Importado',
    parsed.email,
    parsed.telefone,
    parsed.endereco_completo,
    user.id
  );
  if (upsertResult) {
    autoClientId = upsertResult.id;
    autoClientName = upsertResult.name;  // ← NOVO: Guarda nome do banco
    console.log(`✅ [UPSERT] Cliente: ${autoClientName} (${upsertResult.created ? 'criado' : 'existente'})`);
  }
}
```

### Mudança 2: Usar nome do banco no BulkPolicy (linha 548)

```typescript
const bulkPolicy: BulkOCRExtractedPolicy = {
  // ← NOVO: Prioriza nome do banco, depois OCR
  nome_cliente: autoClientName || parsed.nome_cliente || 'Cliente Não Identificado',
  cpf_cnpj: parsed.cpf_cnpj,
  // ... resto igual
};
```

---

## Resumo das Alterações

| Linha | Antes | Depois |
|-------|-------|--------|
| ~530 | `let autoClientId` | `let autoClientId, autoClientName` |
| ~542 | (não usava `upsertResult.name`) | `autoClientName = upsertResult.name` |
| ~548 | `nome_cliente: parsed.nome_cliente \|\| ...` | `nome_cliente: autoClientName \|\| parsed.nome_cliente \|\| ...` |

---

## Resultado Esperado

Quando o CPF/CNPJ bate com um cliente existente:
- **Antes**: Exibe "Ra Jj" (lixo OCR)
- **Depois**: Exibe "Marina Pereira Biso" (nome do banco)

Quando o CPF/CNPJ não existe (cliente novo):
- **Antes**: Exibe "Ra Jj" (lixo OCR)  
- **Depois**: Exibe "Cliente Importado" (fallback sanitizado pelo `upsertClientByDocument`)

---

## Impacto

Esta correção é cirúrgica e resolve o problema na **raiz** - no momento do primeiro upsert. Todas as etapas subsequentes (reconcileClient, montagem do item) já herdarão o nome correto automaticamente.
