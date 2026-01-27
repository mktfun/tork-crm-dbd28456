
# Plano: Fuzzy Anchor Search - Compact Text Matching (v4.0)

## Diagnóstico do Problema

O console mostra que o parser v3.0 está retornando **0% de confiança com 0 campos** mesmo processando 50k+ caracteres de texto:

```
🔍 [PARSER v3.0] Texto normalizado: 54368 caracteres
🔍 [PARSER v3.0] Confiança: 0% (threshold: 80%), Campos: 
```

### Causa Raiz

O OCR está fragmentando palavras-chave cruciais:
- `CPF` → `C P F` ou `C . P . F`
- `APÓLICE` → `A P Ó L I C E`
- `PRÊMIO` → `P R Ê M I O`

A função `extractByAnchor()` usa `indexOf()` que procura a string exata "CPF", mas nunca encontra porque o texto real contém "C P F".

### Solução Proposta: Compact Text Mapping

Criaremos uma versão **compactada** do texto (sem espaços/tabs) para localizar a posição da âncora, e depois voltamos ao texto original para extrair o valor.

```text
┌─────────────────────────────────────────────────────────────────┐
│                    COMPACT TEXT STRATEGY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Texto OCR Original:    "C P F : 1 2 3 . 4 5 6 . 7 8 9 - 0 0"   │
│                                                                  │
│  Compact Text:          "CPF:123.456.789-00"                     │
│                                                                  │
│  1. indexOf("CPF") em Compact → posição 0 (encontrado!)          │
│  2. Mapeia posição 0 do Compact → índice 0 do Original           │
│  3. Extrai 200 chars a partir do Original[índice]                │
│  4. Aplica Regex de CPF na janela                                │
│  5. Retorna: "12345678900" (limpo)                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/utils/universalPolicyParser.ts` | Adicionar `createCompactText()` + `fuzzyExtractByAnchor()` |
| `src/components/policies/ImportPoliciesModal.tsx` | Adicionar debug log com primeiros 2000 chars do texto |

---

## Seção Técnica

### 1. Nova Função: createCompactText()

Cria uma versão do texto sem espaços e retorna um mapeamento de índices:

```typescript
interface CompactTextResult {
  compact: string;           // Texto sem espaços/tabs/newlines
  indexMap: number[];        // indexMap[compactIdx] = originalIdx
}

function createCompactText(originalText: string): CompactTextResult {
  const compact: string[] = [];
  const indexMap: number[] = [];
  
  for (let i = 0; i < originalText.length; i++) {
    const char = originalText[i];
    if (!/[\s\t\n\r]/.test(char)) {
      compact.push(char);
      indexMap.push(i);
    }
  }
  
  return {
    compact: compact.join(''),
    indexMap,
  };
}
```

### 2. Nova Função: fuzzyExtractByAnchor()

Busca a âncora no texto compactado e extrai do original:

```typescript
function fuzzyExtractByAnchor(
  originalText: string,
  compactText: string,
  indexMap: number[],
  anchors: string[],
  regex: RegExp,
  windowSize: number = 200
): string | null {
  for (const anchor of anchors) {
    // Remove espaços da âncora também para matching
    const compactAnchor = anchor.replace(/[\s\.\-]/g, '').toUpperCase();
    const compactUpper = compactText.toUpperCase();
    
    let searchIdx = 0;
    while (true) {
      const anchorIdx = compactUpper.indexOf(compactAnchor, searchIdx);
      if (anchorIdx === -1) break;
      
      // Mapeia posição do compact para o original
      const originalIdx = indexMap[anchorIdx + compactAnchor.length] || 0;
      
      // Extrai janela do texto ORIGINAL
      const window = originalText.substring(originalIdx, originalIdx + windowSize);
      
      const match = window.match(regex);
      if (match?.[1]) {
        return match[1].trim();
      }
      
      searchIdx = anchorIdx + 1;
    }
  }
  
  return null;
}
```

### 3. Refatoração do parsePolicy()

O parser principal usará a nova estratégia:

```typescript
export function parsePolicy(rawText: string, fileName?: string): ParsedPolicy {
  const matchedFields: string[] = [];
  const normalized = normalizeOcrText(rawText);
  
  // NOVO v4.0: Cria versão compactada para busca de âncoras
  const { compact, indexMap } = createCompactText(normalized);
  
  console.log(`🔍 [PARSER v4.0] Original: ${normalized.length} chars, Compact: ${compact.length} chars`);
  
  // --- CPF/CNPJ (Fuzzy Anchor Search) ---
  let cpfCnpj: string | null = null;
  
  // Regex mais tolerante para CPF/CNPJ com ruído
  const CPF_LOOSE = /(\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d[\s.\-]*\d)/;
  
  const cpfRaw = fuzzyExtractByAnchor(
    normalized, compact, indexMap,
    ['CPF', 'C.P.F', 'CPF/MF', 'DOCUMENTO'],
    CPF_LOOSE,
    200
  );
  
  if (cpfRaw) {
    cpfCnpj = cleanDocument(cpfRaw);
    if (cpfCnpj) matchedFields.push('cpf_fuzzy');
  }
  
  // ... resto da implementação
}
```

### 4. Âncoras para Seguradoras

Adiciona detecção direta de marcas de seguradoras no texto compactado:

```typescript
const INSURER_BRANDS = [
  'TOKIOMARINE', 'PORTOSEGURO', 'HDI', 'LIBERTY', 'MAPFRE',
  'ALLIANZ', 'BRADESCO', 'SULAMERICA', 'AZULSEGUROS', 'SOMPO',
  'ITAUSEGUROS', 'ZURICH', 'GENERALI', 'POTTENCIAL', 'JUNTO'
];

// No parsePolicy:
for (const brand of INSURER_BRANDS) {
  if (compact.toUpperCase().includes(brand)) {
    nomeSeguradora = normalizeSeguradora(brand);
    matchedFields.push('seguradora_compact');
    break;
  }
}
```

### 5. Debug Log no Modal

Adiciona log com amostra do texto para diagnóstico:

```typescript
// Após acumular texto
console.log('--- DEBUG TEXT START ---');
console.log(accumulatedText.substring(0, 2000));
console.log('--- DEBUG TEXT END ---');
```

### 6. Fallback para Produtor Padrão

Se nenhum produtor for selecionado, força o primeiro da lista:

```typescript
// No início do save loop
const defaultProducerId = batchProducerId || producers[0]?.id;

// No item
producerId: defaultProducerId || null,
```

---

## Algoritmo Completo de Matching (v4.0)

```text
┌─────────────────────────────────────────────────────────────────┐
│              FUZZY ANCHOR SEARCH FLOW (v4.0)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. NORMALIZAÇÃO                                                 │
│     rawText → normalizeOcrText() → normalized (UPPERCASE)        │
│                                                                  │
│  2. COMPACTAÇÃO                                                  │
│     normalized → createCompactText() → { compact, indexMap }     │
│     "C P F : 1 2 3" → "CPF:123" + mapeamento de índices          │
│                                                                  │
│  3. BUSCA DE ÂNCORA NO COMPACT                                   │
│     compact.indexOf("CPF") → posição no compactado               │
│                                                                  │
│  4. MAPEAMENTO PARA ORIGINAL                                     │
│     indexMap[compactPos] → posição no texto original             │
│                                                                  │
│  5. EXTRAÇÃO COM JANELA                                          │
│     original.substring(pos, pos + 200) → janela de busca         │
│                                                                  │
│  6. APLICAÇÃO DE REGEX                                           │
│     janela.match(CPF_LOOSE) → valor extraído                     │
│                                                                  │
│  7. LIMPEZA E VALIDAÇÃO                                          │
│     cleanDocument() → "12345678900" (11 ou 14 dígitos)           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Regex Tolerantes para OCR Ruidoso

```typescript
// CPF: aceita qualquer coisa entre 11 dígitos
const CPF_LOOSE = /(\d[\s.\-]*){11}/;

// CNPJ: aceita qualquer coisa entre 14 dígitos
const CNPJ_LOOSE = /(\d[\s.\-\/]*){14}/;

// Placa: aceita espaços entre letras e números
const PLACA_LOOSE = /([A-Z][\s]*[A-Z][\s]*[A-Z][\s]*\d[\s]*[A-Z0-9][\s]*\d[\s]*\d)/;

// Data: aceita espaços entre partes
const DATA_LOOSE = /(\d[\s]*\d[\s]*[\/\-][\s]*\d[\s]*\d[\s]*[\/\-][\s]*\d[\s]*\d[\s]*\d[\s]*\d)/;

// Valor: aceita espaços em valores monetários
const VALOR_LOOSE = /R?\$?[\s]*(\d[\s\d.,]*\d)/;
```

---

## Resultado Esperado

### Console Logs (Após Implementação)

```
📄 [PROGRESSIVE] APOLICE DANIELA ROSA MATOS.pdf: páginas 1-2
📝 [OCR] +29457 chars (via LOCAL)
--- DEBUG TEXT START ---
TOKIO MARINE SEGURADORA S.A.
C P F : 1 2 3 . 4 5 6 . 7 8 9 - 0 0
N O M E : D A N I E L A   R O S A   M A T O S
A P Ó L I C E : 1 2 3 4 5 6 7 8 9
--- DEBUG TEXT END ---
🔍 [PARSER v4.0] Original: 29590 chars, Compact: 18500 chars
🔍 [PARSER v4.0] Confiança: 85%, Campos: cpf_fuzzy, seguradora_compact, placa, apolice
✅ [PROGRESSIVE] Threshold atingido!
```

### Tabela de Conferência
- CPF: 12345678900 (extraído corretamente)
- Seguradora: TOKIO MARINE
- Placa: ABC-1234
- Ramo: AUTOMÓVEL (inferido)
- Cliente: Vinculado/Criado automaticamente

---

## Validação e Testes

| Passo | Ação | Resultado Esperado |
|-------|------|-------------------|
| 1 | Upload PDF problemático (DANIELA ROSA MATOS) | Parser encontra CPF no compact text |
| 2 | Verificar console | Log mostra `cpf_fuzzy` nos campos |
| 3 | Verificar tabela | CPF e Seguradora preenchidos |
| 4 | Salvar apólice | Cliente criado/vinculado |

---

## Complexidade e Estimativas

| Tarefa | Complexidade | Linhas |
|--------|--------------|--------|
| `createCompactText()` | Baixa | ~20 |
| `fuzzyExtractByAnchor()` | Média | ~40 |
| Refatorar `parsePolicy()` | Média | ~50 |
| Debug log no Modal | Baixa | ~5 |
| Produtor padrão | Baixa | ~5 |

**Total**: ~120 linhas de código

---

## Vantagens da Abordagem

1. **Resiliência a OCR ruidoso**: Encontra "CPF" mesmo quando está como "C P F"
2. **Mapeamento preciso**: Volta ao texto original para extração correta
3. **Regex tolerantes**: Aceita espaços entre dígitos
4. **Zero IA**: 100% determinístico
5. **Debug facilitado**: Log mostra exatamente o que está sendo processado
