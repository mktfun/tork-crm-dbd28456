

# Plano: Correção do Early-Stop Prematuro - Motor Mistral V12.2

## Diagnóstico do Problema

### Evidências dos Logs

```
Ana Claudia Vieira Duarte.pdf:
  Status: COMPLETO ❌ (incorreto)
  Policy: N/A ❌
  CPF/CNPJ: N/A ❌
  Premium: R$ N/A ❌

PEDRASUL PEDRAS E REVESTIMENTOS.pdf:
  Status: COMPLETO ❌ (incorreto)
  Policy: N/A ❌
  CPF/CNPJ: N/A ❌
  Premium: R$ N/A ❌
```

### Raiz do Problema (Duas Falhas)

**1. Prompt do LLM incompleto (linha 110):**
```
Se campos CRÍTICOS (nome, cpf_cnpj, numero da apolice) estiverem faltando...
```
- NÃO inclui `premio_liquido`, `premio_total`, `data_inicio`, `data_fim`
- O LLM retorna `status: 'COMPLETO'` quando encontra apenas o nome

**2. Early-Stop confia no status do LLM (linha 639):**
```typescript
const isComplete = data.data.status === 'COMPLETO' || isDataComplete(currentMerged).complete;
```
- Se o LLM retorna `COMPLETO`, para imediatamente
- Mesmo que prêmios e datas estejam faltando

**3. Limite de chunks muito baixo (linha 491):**
```typescript
const MAX_CHUNKS = 3; // Limite de 6 páginas
```
- Mesmo sem early-stop, processa no máximo 6 páginas
- PDFs de seguros podem ter 10-20 páginas

---

## Solução Proposta

### 1. Edge Function: Expandir Campos Críticos no Prompt

**Arquivo:** `supabase/functions/analyze-policy-mistral/index.ts`

**Alteração na linha 110:**

De:
```
Se campos CRÍTICOS (nome, cpf_cnpj, numero da apolice) estiverem faltando, retorne status: "INCOMPLETO".
```

Para:
```
## REGRA DE STATUS:
- Retorne status: "COMPLETO" APENAS se TODOS os seguintes campos forem extraídos:
  * nome do cliente
  * cpf_cnpj (11 ou 14 dígitos)
  * numero da apólice
  * premio_liquido OU premio_total (valor > 0)
  * data_inicio E data_fim
- Se QUALQUER um desses campos estiver faltando ou nulo, retorne status: "INCOMPLETO"
```

### 2. Frontend: Não Confiar no Status do LLM

**Arquivo:** `src/components/policies/ImportPoliciesModal.tsx`

**Alteração na linha 639:**

De:
```typescript
const isComplete = data.data.status === 'COMPLETO' || isDataComplete(currentMerged).complete;
```

Para:
```typescript
// v12.2: NUNCA confiar apenas no status do LLM - sempre validar dados reais
const completeness = isDataComplete(currentMerged);
const isComplete = completeness.complete;

// Log para debug
if (data.data.status === 'COMPLETO' && !completeness.complete) {
  console.warn(`⚠️ [TRUST ISSUE] LLM disse COMPLETO mas faltam: ${completeness.missing.join(', ')}`);
}
```

### 3. Frontend: Aumentar Limite de Chunks

**Arquivo:** `src/components/policies/ImportPoliciesModal.tsx`

**Alteração na linha 491:**

De:
```typescript
const MAX_CHUNKS = 3; // Limite de 6 páginas
```

Para:
```typescript
const MAX_CHUNKS = 5; // Limite de 10 páginas (suficiente para maioria das apólices)
```

### 4. Frontend: Melhorar função isDataComplete

**Arquivo:** `src/components/policies/ImportPoliciesModal.tsx`

**Alteração nas linhas 99-120:**

```typescript
const isDataComplete = (data: any): DataCompletenessResult => {
  // v12.2: Campos absolutamente obrigatórios
  const REQUIRED_FIELDS = [
    'nome_cliente',     // Nome do segurado
    'numero_apolice',   // Número da apólice
    'nome_seguradora',  // Seguradora
    'data_inicio',      // Início da vigência
    'data_fim'          // Fim da vigência
  ];
  
  const missing: string[] = [];
  
  for (const field of REQUIRED_FIELDS) {
    const value = data?.[field];
    if (value === null || value === undefined || value === '' || value === 'N/A') {
      missing.push(field);
    }
  }
  
  // CPF/CNPJ: deve ter 11 ou 14 dígitos se presente
  const cpf = data?.cpf_cnpj;
  if (!cpf || (cpf.length !== 11 && cpf.length !== 14)) {
    missing.push('cpf_cnpj');
  }
  
  // Prêmio: pelo menos um dos dois deve ter valor > 0
  const hasValidPremium = (data?.premio_liquido > 0) || (data?.premio_total > 0);
  if (!hasValidPremium) {
    missing.push('premio');
  }
  
  // v12.2: Log de diagnóstico
  if (missing.length > 0) {
    console.log(`📊 [COMPLETENESS] Faltando ${missing.length}: ${missing.join(', ')}`);
  }
  
  return { 
    complete: missing.length === 0, 
    missing 
  };
};
```

---

## Resumo das Alterações

| Arquivo | Alteração | Impacto |
|---------|-----------|---------|
| `analyze-policy-mistral/index.ts` | Expandir campos críticos no prompt | LLM retorna status correto |
| `ImportPoliciesModal.tsx` linha 639 | Ignorar status LLM, validar dados reais | Early-stop só quando dados estão OK |
| `ImportPoliciesModal.tsx` linha 491 | MAX_CHUNKS de 3 para 5 | Processa até 10 páginas |
| `ImportPoliciesModal.tsx` linhas 99-120 | Validar CPF com 11/14 dígitos | Detecta CPFs inválidos |

---

## Fluxo Corrigido

```text
PDF Upload
    │
    ▼
Chunk 1 (págs 1-2)
    │
    ├─ LLM retorna dados parciais
    ├─ isDataComplete() verifica campos REAIS
    ├─ Faltando: premio, data_fim? → CONTINUE
    │
    ▼
Chunk 2 (págs 3-4)
    │
    ├─ Merge com chunk anterior
    ├─ isDataComplete() verifica novamente
    ├─ Ainda falta premio? → CONTINUE
    │
    ▼
Chunk 3 (págs 5-6)
    │
    ├─ Merge acumulativo
    ├─ isDataComplete() → COMPLETO!
    ├─ ✅ EARLY-STOP (economia de págs 7-20)
    │
    ▼
Continua para próximo arquivo
```

---

## Testes de Validação

1. **Upload de PDF com prêmio na página 5:**
   - Verificar que processa até encontrar o prêmio
   - Log: `⏳ [CONTINUE v11] Faltando: premio`

2. **Upload de PDF com todos os dados na página 2:**
   - Verificar early-stop funciona
   - Log: `✅ [EARLY-STOP v11] Dados completos após 1 chunk(s)!`

3. **Upload de PDF sem prêmio (documento incompleto):**
   - Verificar que processa até MAX_CHUNKS (5)
   - UI mostra campos faltantes em vermelho

4. **Verificar que LLM não engana mais:**
   - Log: `⚠️ [TRUST ISSUE] LLM disse COMPLETO mas faltam: premio, data_fim`

