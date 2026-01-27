
# Plano: Aprimoramento do OCR e Lógica de Vínculo Cliente-Apólice

## Diagnóstico do Sistema Atual

### OCR Bulk Analyze (`supabase/functions/ocr-bulk-analyze/index.ts`)
- **Já usa Engine 2 e isTable=true** (linhas 253-256) - está configurado corretamente
- Processa apenas **páginas 1-2** do PDF (trimming inteligente) para economia de tokens
- Usa **OCR.space** como fallback quando extração local tem qualidade baixa
- Limite de 512KB por arquivo para o OCR.space

### Policy Import Service (`src/services/policyImportService.ts`)
- **Problema crítico**: Quando o cliente não é encontrado por CPF/CNPJ, email ou nome fuzzy (85%), o sistema retorna `status: 'new'` mas **não cria o cliente automaticamente** durante a reconciliação
- A criação só acontece na hora de salvar (`createClientFromEdited`), e se o CPF/CNPJ estiver nulo ou inválido, a apólice fica órfã
- Tabela `clientes` tem duplicatas: CPF `248.630.238-71` aparece 7 vezes, `569.896.598-66` aparece 3 vezes

### Ramo Inference (`src/utils/ramoInference.ts`)
- Atualmente **concorre** com a IA - o código roda independente do resultado da IA
- Deveria ser **fallback** apenas quando a IA retornar nulo

---

## Mudanças Propostas

### 1. Edge Function: Otimizar Prompt da IA
**Arquivo**: `supabase/functions/ocr-bulk-analyze/index.ts`

O prompt atual já é bom (linhas 311-354), mas vamos reforçar as seguintes instruções:

```text
## REGRAS CRÍTICAS ADICIONAIS
- CPF: SEMPRE extrair, mesmo parcialmente visível. Formato: apenas números (11 ou 14 dígitos)
- Se encontrar menção a Veículo, Placa, Marca/Modelo, RCF, Automóvel → ramo_seguro = "AUTOMÓVEL"
- NUNCA retorne "NÃO IDENTIFICADO" para nome_cliente se houver qualquer nome no documento
```

**Mudanças específicas:**
- Adicionar validação mais agressiva para extração de CPF (regex reforçado)
- Instruir a IA a priorizar seção "Dados do Segurado" para nome/CPF

### 2. Policy Import Service: Implementar Upsert de Cliente
**Arquivo**: `src/services/policyImportService.ts`

**Nova função `upsertClientByDocument`**:
```typescript
async function upsertClientByDocument(
  documento: string,
  nome: string,
  email: string | null,
  telefone: string | null,
  endereco: string | null,
  userId: string
): Promise<{ id: string; created: boolean }> {
  const normalized = documento.replace(/\D/g, '');
  
  // 1. Busca existente pelo documento
  const { data: existing } = await supabase
    .from('clientes')
    .select('id')
    .eq('user_id', userId)
    .eq('cpf_cnpj', normalized)
    .maybeSingle();
  
  if (existing) {
    return { id: existing.id, created: false };
  }
  
  // 2. Cria novo cliente
  const { data: newClient, error } = await supabase
    .from('clientes')
    .insert({
      user_id: userId,
      name: nome,
      cpf_cnpj: normalized,
      email: email || '',
      phone: telefone || '',
      address: endereco || '',
      status: 'Ativo'
    })
    .select('id')
    .single();
  
  if (error) throw error;
  return { id: newClient.id, created: true };
}
```

**Modificar `reconcileClient`** para usar upsert quando documento disponível:
- Se documento existe → tenta match
- Se não achou match mas tem documento válido → cria automaticamente
- Retorna `clientId` sempre preenchido quando possível

### 3. Ramo Inference: Priorizar IA
**Arquivo**: `src/utils/ramoInference.ts` e `ImportPoliciesModal.tsx`

**Lógica atual** (problemática):
```javascript
// Sempre roda o inferRamoFromDescription
const ramoInferido = inferRamoFromDescription(item.objetoSegurado, ramos);
```

**Nova lógica**:
```javascript
// Prioridade: IA > Inference > null
let ramoId = null;

// 1. Tentar match pelo ramo_seguro retornado pela IA
if (extracted.ramo_seguro) {
  const aiRamo = await matchRamo(extracted.ramo_seguro, userId);
  if (aiRamo) ramoId = aiRamo.id;
}

// 2. Fallback: inferência local apenas se IA falhou
if (!ramoId && extracted.objeto_segurado) {
  ramoId = inferRamoFromDescription(extracted.objeto_segurado, ramosDisponiveis);
}
```

### 4. Índice Único para Evitar Duplicatas
**Database Migration**:
```sql
-- Índice condicional para evitar duplicatas de CPF/CNPJ por user
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj_user_unique 
ON public.clientes (user_id, cpf_cnpj) 
WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != '';
```

**Nota**: O banco atual tem duplicatas que precisarão ser tratadas antes de criar o índice único.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/ocr-bulk-analyze/index.ts` | Reforçar prompt de extração de CPF e ramo |
| `src/services/policyImportService.ts` | Adicionar `upsertClientByDocument`, modificar `reconcileClient` |
| `src/components/policies/ImportPoliciesModal.tsx` | Usar ramo_seguro da IA como prioridade |
| `src/utils/ramoInference.ts` | Manter como está (usado apenas como fallback) |

---

## Fluxo de Importação Atualizado

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   PDF Upload    │────▶│  OCR Bulk        │────▶│  IA Extração        │
│   (páginas 1-2) │     │  (Engine 2 +     │     │  (nome, CPF, ramo,  │
│                 │     │   isTable=true)  │     │   prêmio, datas)    │
└─────────────────┘     └──────────────────┘     └──────────┬──────────┘
                                                            │
                        ┌───────────────────────────────────┘
                        ▼
          ┌─────────────────────────────────┐
          │  reconcileClient (UPSERT)       │
          │  ────────────────────────────── │
          │  1. Busca por CPF/CNPJ          │
          │  2. Se não achou + CPF válido:  │
          │     → CRIA cliente automatico   │
          │  3. Retorna clientId SEMPRE     │
          └─────────────────┬───────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │  matchRamo (PRIORIDADE IA)      │
          │  ────────────────────────────── │
          │  1. Usa ramo_seguro da IA       │
          │  2. Fallback: inferência local  │
          └─────────────────┬───────────────┘
                            │
                            ▼
          ┌─────────────────────────────────┐
          │  Salvar Apólice + Itens         │
          │  (apolices + apolice_itens)     │
          └─────────────────────────────────┘
```

---

## Validação e Testes

1. **Upload de PDF**: Subir `APOLICE EVELINE SUCHOJ.pdf`
2. **Verificar Logs**: Console deve mostrar `📊 [IA]` com JSON contendo CPF extraído
3. **Verificar Cliente**: Novo cliente "EVELINE SUCHOJ" deve existir na tabela `clientes`
4. **Verificar Ramo**: Apólice deve ter `ramo_seguro = 'AUTOMÓVEL'` (inferido pelo ramo_seguro da IA)
5. **Verificar Vínculo**: Apólice deve estar vinculada ao cliente correto

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Duplicatas existentes no banco | Executar query de deduplicação antes do índice único |
| CPF parcialmente extraído | Validação de 11/14 dígitos antes de usar |
| IA retorna ramo genérico | Fallback para inferência local mantido |

---

## Estimativa de Complexidade

| Tarefa | Complexidade |
|--------|--------------|
| Modificar prompt da IA | Baixa |
| Implementar upsert de cliente | Média |
| Ajustar prioridade de ramo | Baixa |
| Migration de índice único | Média (requer deduplicação prévia) |

**Total: 4-5 arquivos modificados, 1 migration SQL**
