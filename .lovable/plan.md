

# Plano: Smart Early-Stopping Chunking v9.0

## Conceito Central

A ideia é otimizar o processamento de PDFs usando **extração adaptativa**:
1. Extrair 2 páginas
2. Verificar se todos os campos críticos foram preenchidos
3. Se **SIM** → Avançar para o próximo PDF (economia de tempo e custo)
4. Se **NÃO** → Extrair mais 2 páginas e fazer merge, repetindo até o fim do PDF

Isso reduz drasticamente o número de chamadas à API do Gemini em apólices curtas (1-3 páginas), onde os dados geralmente estão completos nas primeiras páginas.

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SMART EARLY-STOPPING FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

    Para cada PDF:
    ┌───────────────────────┐
    │   Extrair págs 1-2    │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Dados completos?      │──────── SIM ────────┐
    │ (CPF, Nome, Prêmio,   │                     │
    │  Seguradora, Datas)   │                     ▼
    └───────────┬───────────┘           ┌─────────────────────┐
                │ NÃO                   │  Próximo arquivo    │
                ▼                       │  (economia de 50%+) │
    ┌───────────────────────┐           └─────────────────────┘
    │   Extrair págs 3-4    │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │   Merge resultados    │
    └───────────┬───────────┘
                │
                ▼
    ┌───────────────────────┐
    │ Dados completos?      │──────── SIM ────────┐
    └───────────┬───────────┘                     │
                │ NÃO                             ▼
                ▼                       ┌─────────────────────┐
    ┌───────────────────────┐           │  Próximo arquivo    │
    │ Continua até acabar   │           └─────────────────────┘
    │ as páginas do PDF...  │
    └───────────────────────┘
```

## Campos Críticos para Early-Stopping

A função `isDataComplete()` verificará se os seguintes campos foram extraídos:

| Campo | Obrigatório | Justificativa |
|-------|-------------|---------------|
| `cpf_cnpj` | **SIM** | Chave primária para vinculação de cliente |
| `nome_cliente` | **SIM** | Identificação do segurado |
| `numero_apolice` | **SIM** | Número único do contrato |
| `premio_liquido` ou `premio_total` | **SIM** | Valor do seguro |
| `nome_seguradora` | **SIM** | Companhia emissora |
| `data_inicio` | **SIM** | Vigência |
| `data_fim` | **SIM** | Vigência |
| `ramo_seguro` | NÃO | Pode ser inferido |
| `objeto_segurado` | NÃO | Pode estar em páginas posteriores |

**Critério de completude**: 6 de 7 campos críticos preenchidos (todos exceto ramo, que pode ser inferido).

## Mudanças Técnicas

### 1. Frontend: `ImportPoliciesModal.tsx`

**Nova função `isDataComplete()`**:
```typescript
const REQUIRED_FIELDS = [
  'cpf_cnpj', 'nome_cliente', 'numero_apolice',
  'nome_seguradora', 'data_inicio', 'data_fim'
];

const isDataComplete = (data: any): boolean => {
  const filledCount = REQUIRED_FIELDS.filter(field => {
    const value = data?.[field];
    return value !== null && value !== undefined && value !== '';
  }).length;
  
  // Prêmio: pelo menos um dos dois
  const hasPremio = data?.premio_liquido > 0 || data?.premio_total > 0;
  
  return filledCount >= 6 && hasPremio;
};
```

**Refatoração do loop de chunking** (linhas ~543-589):
- Após cada chunk, verificar `isDataComplete(mergedData)`
- Se completo, sair do loop `while(hasMore)` com `break`
- Logar economia: `"✅ [EARLY-STOP] Dados completos na página X de Y"`

### 2. UI de Progresso Aprimorada

Atualizar o texto de progresso para mostrar:
- `"Arquivo 2/5: Páginas 1-2 ✓ (dados completos)"`
- `"Arquivo 3/5: Páginas 1-2... 3-4... (buscando dados)"`

### 3. Edge Function: Sem Alterações

A Edge Function `analyze-policy` permanece inalterada - ela já retorna JSON estruturado. A lógica de early-stopping é 100% frontend.

### 4. Métricas de Economia

Adicionar ao `ProcessingMetrics`:
```typescript
interface ProcessingMetrics {
  // ... existentes
  chunksProcessed: number;
  chunksSkipped: number;  // NOVO: chunks que não precisaram ser processados
  avgPagesPerFile: number; // NOVO: média de páginas analisadas
}
```

## Benefícios Esperados

| Cenário | Antes (v8.0) | Depois (v9.0) | Economia |
|---------|--------------|---------------|----------|
| PDF 2 páginas | 1 chamada | 1 chamada | 0% |
| PDF 4 páginas | 2 chamadas | 1 chamada* | **50%** |
| PDF 6 páginas | 3 chamadas | 1-2 chamadas* | **33-66%** |
| PDF 10 páginas | 5 chamadas | 1-3 chamadas* | **40-80%** |

*\* Assumindo dados completos nas primeiras páginas (cenário comum em apólices brasileiras)*

## Ordem de Implementação

1. Adicionar função `isDataComplete()` no componente
2. Refatorar o loop `while(hasMore)` para incluir verificação de completude
3. Atualizar logs e UI de progresso
4. Adicionar métricas de economia ao toast final
5. Testar com PDFs de 2, 4 e 6+ páginas

## Validação

1. Upload de PDF de 4 páginas onde todos os dados estão na página 1 → Deve processar apenas 1 chunk
2. Upload de PDF de 6 páginas onde o CPF está na página 4 → Deve processar 2 chunks
3. Verificar logs: `"[EARLY-STOP] Dados completos após chunk 1"`
4. Verificar toast final: `"3 arquivos em 4.2s (economia: 40% de chunks)"`

## Seção Técnica

### Código da função isDataComplete

```typescript
/**
 * v9.0: Verifica se os dados extraídos estão completos para early-stopping
 * Retorna true se todos os campos críticos foram preenchidos
 */
const isDataComplete = (data: any): { complete: boolean; missing: string[] } => {
  const REQUIRED = ['cpf_cnpj', 'nome_cliente', 'numero_apolice', 'nome_seguradora', 'data_inicio', 'data_fim'];
  
  const missing: string[] = [];
  
  for (const field of REQUIRED) {
    const value = data?.[field];
    if (value === null || value === undefined || value === '') {
      missing.push(field);
    }
  }
  
  // Prêmio: pelo menos um
  if (!(data?.premio_liquido > 0 || data?.premio_total > 0)) {
    missing.push('premio');
  }
  
  return { 
    complete: missing.length === 0, 
    missing 
  };
};
```

### Refatoração do loop de processamento

O loop atual em `processFilesIndividually` (linhas 543-589) será modificado para:

```typescript
while (hasMore) {
  // ... código existente de slicing e chamada à API ...
  
  if (data?.success && data.data) {
    chunkResults.push(data.data);
    
    // v9.0: EARLY-STOP CHECK
    const currentMerged = mergeChunkResults(chunkResults);
    const completeness = isDataComplete(currentMerged);
    
    if (completeness.complete) {
      console.log(`✅ [EARLY-STOP v9.0] Dados completos após ${chunkResults.length} chunk(s), pulando ${totalPages - slice.actualEnd} páginas restantes`);
      break; // Sai do loop, economizando chamadas
    } else {
      console.log(`⏳ [CONTINUE v9.0] Faltando: ${completeness.missing.join(', ')}`);
    }
  }
  
  currentPage = endPage + 1;
}
```

