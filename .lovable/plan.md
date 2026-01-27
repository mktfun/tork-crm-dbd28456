
# Plano: Correção de Extração de Nome, Prêmio Líquido e Vinculação de Placa

## Diagnóstico dos Problemas

Baseado na análise do código e da screenshot:

| Problema | Causa Raiz | Evidência |
|----------|-----------|-----------|
| **Nome "Ra Jj"** | Validação `isValidClientName()` aceita nomes com ≥5 chars e ≥2 palavras. "Ra Jj" tem 5 chars e 2 palavras! | Linha 236-252 do `universalPolicyParser.ts` |
| **Prêmio R$ 0,00** | Parser encontra `premio_total` mas não `premio_liquido`. Não há fallback para usar total quando líquido é nulo | Linha 564-565 do `ImportPoliciesModal.tsx`: `premio_liquido: parsed.premio_liquido \|\| 0` |
| **Placa não vincula ao objeto** | Campo OBJETO mostra "FIAT ANO M..." mas a placa aparece separada ("PAM8G98"). O parser monta o objeto corretamente mas algo está quebrando | Linha 653 e 665 do modal: `objetoCompleto = policy.objeto_segurado` |

---

## Correção 1: Validação de Nome Mais Rigorosa

**Arquivo**: `src/utils/universalPolicyParser.ts`

A função `isValidClientName()` precisa ser mais rigorosa:

```text
ANTES:
- Nome ≥ 5 caracteres → PASSA
- Nome ≥ 2 palavras → PASSA
- "Ra Jj" (5 chars, 2 palavras) → PASSA ❌

DEPOIS:
- Nome ≥ 8 caracteres → Mais seguro
- CADA palavra ≥ 2 caracteres → Evita "Ra Jj"
- Pelo menos uma palavra ≥ 3 caracteres → Evita ruído OCR
- "Ra Jj" (palavras de 2 chars apenas) → FALHA ✅
```

Adicionar critérios:
1. Aumentar mínimo total para 8 caracteres (nomes reais são maiores)
2. Verificar que cada palavra tem pelo menos 2 caracteres
3. Verificar que pelo menos uma palavra tem 3+ caracteres
4. Rejeitar se todas as palavras forem menores que 3 caracteres

---

## Correção 2: Fallback de Prêmio Total para Líquido

**Arquivo 1**: `src/utils/universalPolicyParser.ts`

Adicionar lógica de fallback no próprio parser:

```text
Se premio_liquido é null mas premio_total existe:
  → premio_liquido = premio_total / 1.0738 (remove IOF)
```

**Arquivo 2**: `src/components/policies/ImportPoliciesModal.tsx`

Adicionar fallback na construção do BulkOCRExtractedPolicy:

```text
premio_liquido: parsed.premio_liquido || parsed.premio_total || 0
```

E na linha que monta o item:

```text
premioLiquido: sanitizePremio(policy.premio_liquido) || 
               sanitizePremio(policy.premio_total) || 0
```

---

## Correção 3: Montagem Correta do Objeto Segurado

**Arquivo**: `src/utils/universalPolicyParser.ts`

O problema está na extração de veículo. O log mostra `marca, modelo, ano` sendo encontrados, mas a montagem do objeto_segurado pode estar falhando.

Verificar função `extractVehicleInfo()`:
1. Garantir que marca e modelo são capturados corretamente
2. Garantir que a placa está sendo incluída no objeto_segurado

Melhorar a montagem:
```text
Se ramoSeguro === 'Automóvel':
  → objeto_segurado = [MARCA] [MODELO] [ANO] - Placa: [PLACA]
  
Se só tem placa:
  → objeto_segurado = "Veículo - Placa: [PLACA]"
```

---

## Correção 4: Usar Nome do Banco Quando Cliente Existe

**Arquivo**: `src/components/policies/ImportPoliciesModal.tsx`

Quando o cliente já existe no banco (status === 'matched'), o nome exibido deve vir do banco, não do OCR:

```text
Na linha 653 do modal:
  clientName: clientResult.status === 'matched' && clientResult.name 
              ? clientResult.name 
              : policy.nome_cliente
```

Isso requer modificar o retorno de `reconcileClient` para incluir o nome do cliente:

**Arquivo**: `src/services/policyImportService.ts`

Modificar interface de retorno:
```text
Promise<{
  status: ClientReconcileStatus;
  clientId?: string;
  matchedBy?: ...;
  clientName?: string;  // NOVO: Nome do banco
}>
```

---

## Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/utils/universalPolicyParser.ts` | Validação de nome mais rigorosa (≥8 chars, palavras ≥2 chars) |
| `src/utils/universalPolicyParser.ts` | Fallback: usar premio_total quando premio_liquido é nulo |
| `src/utils/universalPolicyParser.ts` | Garantir placa inclusa no objeto_segurado |
| `src/components/policies/ImportPoliciesModal.tsx` | Usar nome do banco quando cliente já existe |
| `src/services/policyImportService.ts` | Retornar nome do cliente no reconcileClient |

---

## Detalhes Técnicos

### Nova Função isValidClientName

```typescript
function isValidClientName(name: string): boolean {
  if (!name) return false;
  
  // Remove espaços extras e normaliza
  const cleanName = name.trim().replace(/\s+/g, ' ');
  
  // Mínimo de 8 caracteres no total (mais realista para nomes)
  if (cleanName.length < 8) {
    console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (muito curto: ${cleanName.length} chars)`);
    return false;
  }
  
  const words = cleanName.split(' ');
  
  // Mínimo de 2 palavras
  if (words.length < 2) {
    console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (apenas ${words.length} palavra)`);
    return false;
  }
  
  // NOVA REGRA: Cada palavra deve ter pelo menos 2 caracteres
  const validWords = words.filter(w => w.length >= 2);
  if (validWords.length < 2) {
    console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (palavras muito curtas)`);
    return false;
  }
  
  // NOVA REGRA: Pelo menos uma palavra com 3+ caracteres
  const hasSubstantialWord = words.some(w => w.length >= 3);
  if (!hasSubstantialWord) {
    console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (sem palavra substancial)`);
    return false;
  }
  
  // Verifica blacklist
  const alphaName = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  for (const forbidden of INSTITUTIONAL_BLACKLIST) {
    if (alphaName.includes(forbidden)) {
      console.log(`🚫 [NAME FILTER] Rejeitado: "${name}" (contém "${forbidden}")`);
      return false;
    }
  }
  
  return true;
}
```

### Fallback de Prêmio no Parser

```typescript
// Após extrair ambos os prêmios
if (!premioLiquido && premioTotal) {
  // Estima líquido removendo IOF (~7.38%)
  premioLiquido = Math.round((premioTotal / 1.0738) * 100) / 100;
  console.log(`💰 [FALLBACK] Prêmio Líquido estimado: ${premioLiquido} (Total: ${premioTotal})`);
  matchedFields.push('premio_liquido_estimated');
}
```

### Retorno de Nome do Banco

```typescript
// Em reconcileClient, linha 651-657
if (clientByCpf) {
  return {
    status: 'matched',
    clientId: clientByCpf.id,
    clientName: clientByCpf.name,  // NOVO
    matchedBy: 'cpf_cnpj',
  };
}
```

### Uso do Nome do Banco no Modal

```typescript
// Em processFilesIndividually, linha 651-654
const item: PolicyImportItem = {
  // ...
  clientName: clientResult.clientName || policy.nome_cliente || 'Cliente Não Identificado',
  // ...
};
```

---

## Resultado Esperado

Após as correções:

| Campo | Antes | Depois |
|-------|-------|--------|
| Cliente | "Ra Jj" | "Nome Real do Banco" ou "Cliente Não Identificado" |
| Prêmio | R$ 0,00 | Valor real extraído (líquido ou total estimado) |
| Objeto | "FIAT ANO M..." (sem placa) | "FIAT ARGO 2023 - Placa: PAM8G98" |
| Vinculação | "Vinculado" com nome lixo | "Vinculado" com nome correto |

---

## Testes de Validação

1. **Nome "Ra Jj"**: Deve ser rejeitado pela nova validação → usar nome do banco ou "Cliente Importado"
2. **Prêmio zerado**: Se premio_total existe, usar como fallback para premio_liquido
3. **Placa no objeto**: Campo OBJETO deve mostrar "MARCA MODELO ANO - Placa: XXX0000"
4. **Cliente existente**: Quando CPF bate, nome exibido deve vir do banco, não do OCR
