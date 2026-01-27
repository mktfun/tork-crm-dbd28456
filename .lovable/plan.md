
# Plano: Migração para Extração Estruturada via Gemini (Eliminação do Parser v5.7)

## Diagnóstico Completo do Sistema Atual

### Arquitetura Atual (Fluxo de Importação)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO ATUAL (PROBLEMÁTICO)                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. PDF Upload                                                               │
│       ▼                                                                      │
│  2. analyze-policy (Edge Function)                                           │
│       │  ├─ PDF → Páginas 1-2 (trim via pdf-lib)                            │
│       │  ├─ Extração texto local (regex BT/ET)                              │
│       │  ├─ Fallback: OCR.space                                             │
│       │  └─ Lovable AI (Gemini 2.5 Flash) → JSON estruturado                │
│       ▼                                                                      │
│  3. ImportPoliciesModal.tsx                                                  │
│       │  ├─ Recebe dados extraídos da IA                                    │
│       │  └─ universalPolicyParser.ts (PARSER LOCAL v5.7) ← ❌ REDUNDANTE!   │
│       ▼                                                                      │
│  4. policyImportService.ts                                                   │
│       │  ├─ reconcileClient() → Fuzzy matching                              │
│       │  └─ Criação de cliente/apólice                                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Problemas Identificados

| Problema | Causa Raiz | Impacto |
|----------|------------|---------|
| **Nomes com "modelo" no final** | IA extrai "Tatiane della barda modelo" como texto OCR bruto | Cliente duplicado |
| **Nomes com prefixo "Ra"** | Parser regex captura códigos de referência do PDF (ex: "RA MARINA") | Clientes lixo criados |
| **Duplicação de apólices** | Mesmo número extraído de arquivos diferentes (lotes processados juntos) | Confusão nos registros |
| **Prêmio Líquido = null** | Parser regex não encontra âncora exata, IA não recebe instrução clara | Campos vazios |
| **Fuzzy Matching falha** | Nome com typo (barda vs barba) não atinge threshold 85% | Duplicatas |

### Arquivos Envolvidos

| Arquivo | Função | Status |
|---------|--------|--------|
| `supabase/functions/analyze-policy-single/index.ts` | Extração individual via IA | ✅ Funciona bem |
| `supabase/functions/ocr-bulk-analyze/index.ts` | Extração em lote via IA | ⚠️ Prompt precisa ajustes |
| `src/utils/universalPolicyParser.ts` | Parser local (928 linhas de regex) | ❌ **REDUNDANTE - DEPRECAR** |
| `src/services/policyImportService.ts` | Reconciliação de cliente | ⚠️ Precisa sanitização |
| `src/components/policies/ImportPoliciesModal.tsx` | Interface de importação | ⚠️ Ajustar fluxo |

---

## Solução Proposta: Extração Estruturada v6.0

### Nova Arquitetura (Simplificada)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO NOVO (EXTRAÇÃO ESTRUTURADA v6.0)                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. PDF Upload                                                               │
│       ▼                                                                      │
│  2. analyze-policy-single (Edge Function) ← APRIMORADA                       │
│       │  ├─ PDF → Páginas 1-2 (trim via pdf-lib)                            │
│       │  ├─ Extração texto local ou OCR.space                               │
│       │  └─ Gemini 3 Flash Preview + Chain of Thought + Schema Estrito      │
│       ▼                                                                      │
│  3. ImportPoliciesModal.tsx                                                  │
│       │  ├─ Recebe dados JÁ SANITIZADOS pela IA                             │
│       │  └─ universalPolicyParser.ts → ❌ NÃO USA MAIS                       │
│       ▼                                                                      │
│  4. policyImportService.ts                                                   │
│       │  ├─ sanitizeExtractedName() → Limpeza final                         │
│       │  ├─ reconcileClient() → Fuzzy matching APRIMORADO (70%+)            │
│       │  └─ Criação de cliente/apólice                                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementação Detalhada

### Frente 1: Prompt Aprimorado para Edge Function

**Arquivo:** `supabase/functions/analyze-policy-single/index.ts`

Novo System Prompt com **Chain of Thought** e regras de sanitização:

```typescript
const systemPrompt = `Você é um ANALISTA SÊNIOR de seguros brasileiro.
SIGA O PROCESSO ABAIXO RIGOROSAMENTE (Chain of Thought):

## PASSO 1: IDENTIFICAR TIPO DE DOCUMENTO
Leia o cabeçalho e identifique:
- APOLICE: Documento emitido com número final
- PROPOSTA: Antes da emissão (número de proposta)
- ORCAMENTO: Apenas cotação (sem número definitivo)
- ENDOSSO: Alteração em apólice existente

## PASSO 2: LOCALIZAR SEÇÃO "DADOS DO SEGURADO"
Procure por termos: "Segurado", "Titular", "Estipulante", "Proponente"
EXTRAIA:
- Nome COMPLETO (ignorar corretores, seguradoras, modelos de veículo)
- CPF ou CNPJ (apenas dígitos, 11 ou 14 chars)
- Email (se disponível)
- Telefone (se disponível)

## PASSO 3: SANITIZAR NOME DO CLIENTE (CRÍTICO!)
O nome extraído DEVE passar por limpeza:
- REMOVER palavras que são parte de veículos: modelo, versão, flex, aut, manual, turbo
- REMOVER prefixos de OCR: RA, RG, CP, NR, NO, SEQ, COD, REF, ID, PROP, NUM
- REMOVER números puros no início ou fim
- RESULTADO: Apenas o nome da pessoa/empresa

Exemplo:
- "RA TATIANE DELLA BARDA MODELO" → "Tatiane Della Barda"
- "ALEXANDRE PELLAGIO MODELO 350" → "Alexandre Pellagio"
- "123456 MARINA DA SILVA" → "Marina Da Silva"

## PASSO 4: EXTRAIR VALORES FINANCEIROS
Procure na ordem de prioridade:
1. "Prêmio Líquido", "Premio Comercial", "Valor Base"
2. Se não achar: premio_liquido = premio_total / 1.0738
3. IOF = premio_total - premio_liquido (aproximado)

SEMPRE retorne números SEM "R$", usando PONTO como decimal.

## PASSO 5: IDENTIFICAR RAMO DO SEGURO
Palavras-chave por ramo:
- AUTOMÓVEL: placa, veículo, marca, modelo, chassi, rcf, conduto, colisão
- RESIDENCIAL: casa, apartamento, imóvel, residência, incêndio residencial
- VIDA: morte, invalidez, funeral, ap, acidentes pessoais, prestamista
- EMPRESARIAL: empresa, comercial, cnpj, lucros cessantes
- SAÚDE: médico, hospitalar, plano, odonto

## PASSO 6: EXTRAIR OBJETO SEGURADO
Para AUTO:
- objeto_segurado = MARCA + MODELO (ex: "VW Golf GTI 2.0 TSI")
- identificacao_adicional = PLACA (7 chars, sem UF)

Para RESIDENCIAL:
- objeto_segurado = "Imóvel Residencial"
- identificacao_adicional = CEP

## REGRAS DE OURO (NÃO VIOLAR!)
1. CPF/CNPJ: APENAS dígitos (11 ou 14). Nunca null se visível no documento!
2. Datas: formato YYYY-MM-DD
3. Valores: números puros (ex: 1234.56)
4. Nome: SANITIZADO, sem lixo de OCR, sem partes de veículo
5. Se não encontrar um campo, use null`;
```

### Frente 2: Sanitização no policyImportService.ts

**Arquivo:** `src/services/policyImportService.ts`

Nova função de sanitização robusta:

```typescript
// v6.0: Sanitização agressiva de nomes extraídos
const VEHICLE_NOISE_WORDS = [
  'modelo', 'versao', 'versão', 'flex', 'aut', 'auto', 'manual', 'mec', 
  'turbo', 'tsi', 'tfsi', 'mpi', 'gti', 'gli', 'tdi', 'hdi', 'sedan',
  'hatch', 'suv', 'pickup', 'cabine', 'dupla', 'simples', 'cv', 'hp',
  '350', '500', '1.0', '1.4', '1.6', '1.8', '2.0', '3.0'
];

const OCR_NOISE_PREFIXES = [
  'ra', 'rg', 'cp', 'nr', 'no', 'sr', 'dr', 'sra', 'dra',
  'n°', 'nº', 'cpf', 'cnpj', 'doc', 'seq', 'cod', 'ref', 'id',
  'prop', 'num', 'nro', 'numero', 'cli', 'cliente', 'segurado'
];

export function sanitizeExtractedName(name: string): string {
  if (!name) return 'Cliente Importado';
  
  let words = name.trim().split(/\s+/);
  
  // 1. Remove prefixos de OCR no início
  while (words.length >= 2) {
    const first = words[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (OCR_NOISE_PREFIXES.includes(first) || /^\d+$/.test(first) || first.length <= 2) {
      console.log(`🧹 [SANITIZE v6.0] Removendo prefixo: "${words[0]}"`);
      words.shift();
    } else {
      break;
    }
  }
  
  // 2. Remove palavras de veículo no final
  while (words.length >= 2) {
    const last = words[words.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (VEHICLE_NOISE_WORDS.includes(last) || /^\d+$/.test(last)) {
      console.log(`🧹 [SANITIZE v6.0] Removendo sufixo: "${words[words.length - 1]}"`);
      words.pop();
    } else {
      break;
    }
  }
  
  // 3. Valida resultado
  if (words.length < 2 || words.join('').length < 5) {
    console.log(`🚫 [SANITIZE v6.0] Nome insuficiente após limpeza`);
    return 'Cliente Importado';
  }
  
  // 4. Title Case
  const sanitized = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
  
  console.log(`✅ [SANITIZE v6.0] "${name}" → "${sanitized}"`);
  return sanitized;
}
```

### Frente 3: Fuzzy Matching Aprimorado (Threshold 70%)

**Arquivo:** `src/services/policyImportService.ts`

Reduzir threshold de 85% para 70% para capturar variações como "barda" vs "barba":

```typescript
// v6.0: Threshold mais permissivo para variações de OCR
const FUZZY_THRESHOLD = 0.70;  // Era 0.85

async function findClientByNameFuzzy(name: string, userId: string) {
  if (!name || name.length < 3) return null;

  // v6.0: Sanitiza ANTES de buscar
  const sanitizedName = sanitizeExtractedName(name);
  const cleanedInputName = cleanNameForMatching(sanitizedName);
  
  const { data: clients, error } = await supabase
    .from('clientes')
    .select('id, name, cpf_cnpj, email')
    .eq('user_id', userId)
    .limit(500);

  if (error || !clients?.length) return null;

  const scored = clients.map(c => ({
    ...c,
    score: similarity(cleanedInputName, cleanNameForMatching(c.name))
  }));

  scored.sort((a, b) => b.score - a.score);

  // v6.0: Threshold de 70% (captura variações como barda/barba)
  if (scored[0]?.score >= FUZZY_THRESHOLD) {
    console.log(`✅ [FUZZY v6.0] "${name}" → "${scored[0].name}" (${(scored[0].score * 100).toFixed(0)}%)`);
    return scored[0];
  }

  return null;
}
```

### Frente 4: Deprecar universalPolicyParser.ts

O parser regex v5.7 não será mais usado no fluxo principal. A extração agora é 100% via IA.

**Ação:** Adicionar comentário de deprecação no arquivo:

```typescript
/**
 * @deprecated Este parser foi substituído pela extração via IA (Gemini 3 Flash).
 * Mantido apenas para fallback/debug.
 * Ver: supabase/functions/analyze-policy-single/index.ts
 */
```

### Frente 5: Atualizar Edge Function com Gemini 3 Flash

**Arquivo:** `supabase/functions/analyze-policy-single/index.ts`

Atualizar modelo para a versão mais recente:

```typescript
// v6.0: Usar Gemini 3 Flash Preview (melhor raciocínio)
const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-3-flash-preview',  // Atualizado de 2.5-flash
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analise este documento (${fileName}):\n\n${filteredText}` }
    ],
    tools: [toolSchema],
    tool_choice: { type: "function", function: { name: "extract_policy" } }
  })
});
```

---

## Alterações por Arquivo

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/analyze-policy-single/index.ts` | Prompt Chain of Thought, modelo Gemini 3 Flash, regras de sanitização |
| `supabase/functions/ocr-bulk-analyze/index.ts` | Mesmo prompt atualizado |
| `src/services/policyImportService.ts` | Nova função `sanitizeExtractedName()`, threshold 70% |
| `src/utils/universalPolicyParser.ts` | Deprecar (adicionar comentário), manter para fallback |
| `src/components/policies/ImportPoliciesModal.tsx` | Remover chamadas ao parser local |

---

## Validação Pós-Implementação

### Cenário 1: Nome com Ruído de Veículo
- **Input:** "TATIANE DELLA BARDA MODELO"
- **Esperado:** Cliente = "Tatiane Della Barda"
- **Verificar:** Não cria duplicata se "Tatiane Della Barba" já existe (70% similarity)

### Cenário 2: Nome com Prefixo OCR
- **Input:** "RA MARINA DA SILVA"
- **Esperado:** Cliente = "Marina Da Silva"
- **Verificar:** Fuzzy match encontra "Marina da Silva" existente

### Cenário 3: Prêmio Líquido Ausente
- **Input:** Documento só com "Prêmio Total: R$ 1.234,56"
- **Esperado:** premio_liquido = 1150.14 (1234.56 / 1.0738)

### Cenário 4: CPF Detectado
- **Input:** Documento com CPF visível
- **Esperado:** cpf_cnpj NUNCA é null
- **Verificar:** Cliente vinculado automaticamente pelo CPF

---

## Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Precisão de nomes | ~60% | 95%+ |
| Duplicatas criadas | Alta | Mínima |
| Prêmio Líquido extraído | ~40% | 90%+ |
| CPF/CNPJ extraído | ~70% | 95%+ |
| Tempo de processamento | Similar | Similar |
