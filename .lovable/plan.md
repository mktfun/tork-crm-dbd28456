
# Plano: Morte à IA - Parser Determinístico via Regex Universal

## Diagnóstico da Arquitetura Atual

### Fluxo Atual (com IA)
```text
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
│  ImportPoliciesModal.tsx                                        │
│  processFilesIndividually():                                    │
│    for (file of files) {                                        │
│      const result = await invoke('analyze-policy', {...});      │
│      // Depende 100% da IA para extração                        │
│    }                                                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │ N chamadas individuais
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: analyze-policy                      │
│  1. PDF → Base64 → Trim (4 páginas)                            │
│  2. Envia PDF direto para Gemini 2.0 Flash                     │
│  3. IA faz OCR + Extração (schema forçado)                     │
│  4. Retorna JSON estruturado                                   │
│                                                                 │
│  🔴 PROBLEMA: 100% dependente de IA                            │
│  🔴 CUSTO: Tokens para cada PDF (visão multimodal)             │
│  🔴 LATÊNCIA: 3-8s por arquivo                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Problemas Identificados
1. **Dependência total de IA** - Gemini 2.0 Flash faz OCR + Extração
2. **Custo por documento** - Tokens de visão são caros
3. **Limite do OCR.space gratuito** - 512KB por arquivo, 500 req/dia
4. **Inconsistência** - IA pode errar CPF, Ramo, Valores

---

## Arquitetura Proposta (Parser Determinístico)

```text
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Orquestrador)                     │
│  ImportPoliciesModal.tsx                                        │
│                                                                 │
│  for (file of files) {                                         │
│    1. const rawText = await invoke('extract-text-only')        │
│    2. const parsed = universalPolicyParser(rawText)            │
│    3. const clientId = await upsertClient(parsed.documento)    │
│    4. Preenche tabela de conferência                           │
│  }                                                             │
└───────────────┬─────────────────────────────────────────────────┘
                │ N chamadas sequenciais
                ▼
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: extract-text-only                   │
│  (NOVA ou refatorada de analyze-policy)                        │
│                                                                 │
│  1. Recebe UM arquivo (base64, fileName)                       │
│  2. Trim PDF para 2 páginas (reduce to <512KB)                 │
│  3. Tenta extração local (regex em PDF streams)                │
│  4. Se qualidade baixa → OCR.space (Engine 2, isTable=true)    │
│  5. Retorna APENAS { rawText: "...", source: "OCR" | "LOCAL" } │
│                                                                 │
│  ✅ SEM IA! Apenas OCR puro                                     │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│              FRONTEND: universalPolicyParser()                  │
│  src/utils/universalPolicyParser.ts (NOVO)                     │
│                                                                 │
│  Padrões Regex Ancorados:                                      │
│  ─────────────────────────────────────────────────────────────  │
│  - documento: /CPF.*?(\d{11})|CNPJ.*?(\d{14})/i               │
│  - placa: /[A-Z]{3}[\-\s]?\d[A-Z0-9]\d{2}/i                   │
│  - apolice: /(?:Apólice|Proposta)\s*(?:Nº|n°)?.*?(\d{5,})/i   │
│  - valor: /Prêmio\s*Líquido.*?R\$?\s*([\d.,]+)/i              │
│  - vigencia: /(?:Início|Vigência).*?(\d{2}\/\d{2}\/\d{4})/i   │
│  - nome: /(?:Segurado|Titular|Estipulante)[\s:]+(.+)/i        │
│  - seguradora: /(?:Seguradora|Cia|Companhia)[\s:]+(.+)/i      │
│                                                                 │
│  ✅ DETERMINÍSTICO! Mesma entrada = mesma saída                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/analyze-policy/index.ts` | **Refatorar** | Remover Gemini, retornar apenas rawText |
| `src/utils/universalPolicyParser.ts` | **Criar** | Parser regex com 15+ âncoras |
| `src/components/policies/ImportPoliciesModal.tsx` | **Modificar** | Chamar OCR + Parser localmente |
| `src/services/policyImportService.ts` | **Modificar** | Reforçar upsert atômico |

---

## Detalhamento Técnico

### 1. Nova Edge Function: OCR-Only Mode

**Arquivo**: `supabase/functions/analyze-policy/index.ts`

O código será simplificado drasticamente:

```typescript
serve(async (req) => {
  // 1. Recebe base64 do arquivo
  const { base64, fileName, mimeType } = await req.json();
  
  // 2. Trim PDF para 2 páginas (< 512KB)
  const miniPdf = await trimPdfTo2Pages(base64);
  
  // 3. Tenta extração local primeiro
  let rawText = extractTextFromPdfBuffer(miniPdf);
  let source = 'LOCAL';
  
  // 4. Se qualidade ruim, usa OCR.space
  if (evaluateTextQuality(rawText).score < 30) {
    rawText = await callOcrSpace(miniPdf);
    source = 'OCR';
  }
  
  // 5. Retorna APENAS texto bruto
  return Response.json({
    success: true,
    rawText: rawText,
    source: source,
    fileName: fileName
  });
});
```

**Remoções**:
- `GOOGLE_AI_API_KEY` - não será mais usada nesta função
- `EXTRACTION_PROMPT` - prompts de IA removidos
- Schema JSON para Gemini - não aplicável
- Chamada para `generativelanguage.googleapis.com` - eliminada

**Mantidos**:
- `trimPdfTo2Pages()` - reduz tamanho para OCR
- `uint8ArrayToBase64()` - conversão segura
- OCR.space como fallback

### 2. Parser Universal com Âncoras

**Arquivo**: `src/utils/universalPolicyParser.ts` (NOVO)

```typescript
interface ParsedPolicy {
  // Cliente
  nome_cliente: string | null;
  cpf_cnpj: string | null;
  email: string | null;
  telefone: string | null;
  
  // Documento
  numero_apolice: string | null;
  numero_proposta: string | null;
  
  // Seguro
  nome_seguradora: string | null;
  ramo_seguro: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  
  // Objeto
  objeto_segurado: string | null;
  placa: string | null;
  
  // Valores
  premio_liquido: number | null;
  premio_total: number | null;
  
  // Meta
  confidence: number;
  matched_fields: string[];
}

// Âncoras universais para seguradoras brasileiras
const PATTERNS = {
  // CPF: aceita 000.000.000-00 ou 00000000000
  cpf: /(?:CPF|C\.P\.F)[\s:]*(\d{3}[.\s]?\d{3}[.\s]?\d{3}[\-\s]?\d{2})/i,
  
  // CNPJ: aceita 00.000.000/0000-00 ou 00000000000000
  cnpj: /(?:CNPJ|C\.N\.P\.J)[\s:]*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[\s\/]?\d{4}[\-\s]?\d{2})/i,
  
  // Placa Mercosul ou antiga
  placa: /(?:PLACA|Placa)[\s:]*([A-Z]{3}[\-\s]?\d[A-Z0-9]\d{2})/i,
  
  // Número da Apólice (5-15 dígitos)
  apolice: /(?:N[º°]?\s*(?:da\s+)?Ap[óo]lice|APÓLICE)[\s:]*(\d{5,15})/i,
  
  // Número da Proposta
  proposta: /(?:N[º°]?\s*(?:da\s+)?Proposta|PROPOSTA)[\s:]*(\d{5,15})/i,
  
  // Prêmio Líquido (R$ 1.234,56 ou 1234.56)
  premio_liquido: /(?:Prêmio|Premio)\s*Líquido[\s:R$]*([\d.,]+)/i,
  
  // Prêmio Total
  premio_total: /(?:Prêmio|Premio)\s*Total[\s:R$]*([\d.,]+)/i,
  
  // Data início
  data_inicio: /(?:Início|Vigência\s*de|De)[\s:]*(\d{2}[\/-]\d{2}[\/-]\d{4})/i,
  
  // Data fim
  data_fim: /(?:Término|Fim|Vigência\s*até|Até|A)[\s:]*(\d{2}[\/-]\d{2}[\/-]\d{4})/i,
  
  // Nome do Segurado (captura até quebra de linha)
  nome: /(?:Segurado|Titular|Estipulante|Proponente)[\s:]+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]{5,60})/i,
  
  // Seguradora
  seguradora: /(?:Seguradora|Companhia|Cia)[\s:]+([A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s]+(?:S\.?A\.?|SEGUROS)?)/i,
  
  // Email
  email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
  
  // Telefone (formato brasileiro)
  telefone: /(?:\(\d{2}\)\s*)?(?:9\s?)?\d{4}[\-\s]?\d{4}/,
};

// Ramos por keyword (heurística determinística)
const RAMO_KEYWORDS = {
  'AUTOMÓVEL': ['placa', 'veículo', 'marca', 'modelo', 'chassi', 'rcf', 'auto', 'carro'],
  'RESIDENCIAL': ['residencial', 'residência', 'casa', 'apartamento', 'imóvel', 'incêndio'],
  'VIDA': ['vida', 'invalidez', 'morte', 'funeral', 'prestamista', 'acidentes pessoais'],
  'EMPRESARIAL': ['empresarial', 'empresa', 'comercial', 'cnpj', 'estabelecimento'],
  'SAÚDE': ['saúde', 'médico', 'hospitalar', 'odonto', 'plano'],
};

export function parsePolicy(rawText: string): ParsedPolicy {
  // ... implementação com cada regex
}
```

### 3. Frontend Orquestrando OCR + Parser

**Arquivo**: `src/components/policies/ImportPoliciesModal.tsx`

```typescript
const processFilesIndividually = async () => {
  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    
    // 1. Chama Edge Function para OCR (sem IA)
    const { data: ocrResult } = await supabase.functions.invoke('analyze-policy', {
      body: { 
        base64: await fileToBase64(file), 
        fileName: file.name,
        mode: 'ocr-only'  // <-- NOVO FLAG
      }
    });
    
    if (!ocrResult?.rawText) {
      errors.push({ fileName: file.name, error: 'OCR falhou' });
      continue;
    }
    
    // 2. Parser LOCAL no browser (sem rede!)
    const parsed = universalPolicyParser.parsePolicy(ocrResult.rawText);
    
    // 3. Upsert automático se documento válido
    if (parsed.cpf_cnpj) {
      const clientResult = await upsertClientByDocument(
        parsed.cpf_cnpj,
        parsed.nome_cliente || 'Cliente Importado',
        parsed.email,
        parsed.telefone,
        null,
        user.id
      );
      parsed.clientId = clientResult?.id;
    }
    
    // 4. Inferir ramo via keywords
    if (!parsed.ramo_seguro) {
      parsed.ramo_seguro = inferRamoFromText(ocrResult.rawText);
    }
    
    results.push(parsed);
  }
  
  await reconcileResults(results);
};
```

### 4. Service: Upsert Atômico Reforçado

**Arquivo**: `src/services/policyImportService.ts`

O método `upsertClientByDocument` já existe (linhas 519-591). Apenas garantir que:
- Limpa CPF/CNPJ para apenas dígitos
- Valida tamanho (11 ou 14)
- Usa `onConflict: 'user_id, cpf_cnpj'`

---

## Mapeamento de Aliases para Ramos

**Nova seção em** `src/utils/universalPolicyParser.ts`:

```typescript
// Aliases usados por diferentes seguradoras
const RAMO_ALIASES: Record<string, string> = {
  'rcf-v': 'AUTOMÓVEL',
  'rcf': 'AUTOMÓVEL',
  'auto pf': 'AUTOMÓVEL',
  'auto pj': 'AUTOMÓVEL',
  'pessoa física auto': 'AUTOMÓVEL',
  'residencia habitual': 'RESIDENCIAL',
  'multi residencial': 'RESIDENCIAL',
  'vida em grupo': 'VIDA',
  'ap': 'VIDA',
  'acidentes pessoais': 'VIDA',
  'empresarial compreensivo': 'EMPRESARIAL',
  'riscos nomeados': 'EMPRESARIAL',
};

function normalizeRamo(ramoExtraido: string | null): string | null {
  if (!ramoExtraido) return null;
  const key = ramoExtraido.toLowerCase().trim();
  return RAMO_ALIASES[key] || ramoExtraido.toUpperCase();
}
```

---

## Comparativo de Arquiteturas

| Aspecto | Com IA (Atual) | Sem IA (Proposto) |
|---------|----------------|-------------------|
| Dependência externa | Gemini API | OCR.space (gratuito) |
| Custo por documento | ~$0.003-0.01 | $0.00 |
| Latência média | 3-8s | 1-2s |
| Previsibilidade | Variável | 100% determinístico |
| Extração de CPF | ~90% | ~99% (regex preciso) |
| Extração de Valores | ~85% | ~95% (pattern monetário) |
| Limite diário | Ilimitado* | 500 req (OCR.space free) |

*Ilimitado com custo proporcional

---

## Riscos e Mitigações

### Risco 1: OCR.space 500 req/dia
**Mitigação**: Usar extração local primeiro (regex em PDF streams). OCR.space só como fallback.

### Risco 2: PDFs com imagens escaneadas
**Mitigação**: OCR.space Engine 2 é excelente para scans. Manter como fallback obrigatório.

### Risco 3: Regex não captura variações
**Mitigação**: Criar banco de aliases expandível (`RAMO_ALIASES`, `SEGURADORA_ALIASES`).

---

## Ordem de Implementação

1. **Criar `universalPolicyParser.ts`** (15 patterns + inferência de ramo)
2. **Modificar `analyze-policy` Edge Function** (remover Gemini, retornar rawText)
3. **Modificar `ImportPoliciesModal.tsx`** (usar parser local)
4. **Testar com PDFs variados** (Porto, HDI, Tokio, etc.)
5. **Criar aliases para ramos e seguradoras**

---

## Validação e Testes

1. **Subir PDF da Porto Seguro** → Verificar CPF extraído com regex
2. **Subir PDF da HDI** → Verificar limpeza de código numérico em `objeto_segurado`
3. **Verificar Network tab** → Apenas 1 call para `analyze-policy` (OCR)
4. **Console.log** → Ver `rawText` chegando e `parsed` sendo gerado localmente
5. **Verificar Clientes** → Mesmo CPF não cria duplicata (unique index ativo)

---

## Estimativa de Complexidade

| Tarefa | Complexidade | Linhas |
|--------|--------------|--------|
| `universalPolicyParser.ts` | Alta | ~200 |
| Refatorar `analyze-policy` | Média | -150 (remoção) |
| Modificar `ImportPoliciesModal` | Média | ~50 |
| Aliases de Ramos | Baixa | ~50 |

**Resultado**: Elimina dependência de IA, reduz custo a zero, aumenta velocidade 3x.
