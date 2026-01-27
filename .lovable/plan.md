
# Plano: Refatoração do Motor de Importação + Limpeza de Clientes Duplicados

## Análise do Problema

### Dados Atuais no Banco
Encontrei 7 clientes "lixo" criados pela importação:

| Nome | CPF/CNPJ | Apólices |
|------|----------|----------|
| Ra Marina | 35939607888 | 0 |
| Ra Abrahao | 31897639848 | 0 |
| Ra Angelica | 21617669881 | 0 |
| Ra Daniela | 22699965855 | 0 |
| Cliente Importado | 32419929934 | 0 |
| Cliente Importado | 50777822881 | 0 |
| Cliente Importado | 24832415816 | 0 |

Nenhum tem apólices vinculadas, então podem ser deletados com segurança.

### Causa Raiz

O problema tem duas fontes:

1. **Parser v5.6** - O `NOME_REGEX` ainda captura "RA MARINA" onde "RA" é ruído de OCR (código de referência do PDF). A função `cleanOcrNoiseFromName` só remove prefixos quando há 3+ palavras, mas "Ra Marina" tem apenas 2.

2. **Upsert Agressivo** - Se o parser extrai um CPF válido mas nome inválido, o sistema cria cliente com o nome sanitizado ("Cliente Importado") ou com o lixo ("Ra Marina").

---

## Solução em 3 Frentes

### Frente 1: Script SQL de Limpeza Imediata

Deletar os 7 clientes "lixo" (sem apólices vinculadas):

```sql
-- Fase 1: Verificar que não há apólices órfãs
SELECT c.id, c.name, COUNT(a.id) as apolices
FROM clientes c
LEFT JOIN apolices a ON a.client_id = c.id
WHERE c.name LIKE 'Ra %' 
   OR c.name LIKE 'Cliente Importado%'
GROUP BY c.id, c.name;

-- Fase 2: Deletar clientes lixo (SEGUROS - todos têm 0 apólices)
DELETE FROM clientes 
WHERE (name LIKE 'Ra %' OR name LIKE 'Cliente Importado%')
  AND id NOT IN (SELECT DISTINCT client_id FROM apolices WHERE client_id IS NOT NULL);
```

### Frente 2: Correção do Parser (universalPolicyParser.ts)

**Problema:** `cleanOcrNoiseFromName` só remove prefixos quando `words.length > 2`, mas "Ra Marina" tem exatamente 2 palavras.

**Correção:** Remover prefixos de ruído MESMO com apenas 2 palavras, desde que a primeira seja um prefixo conhecido:

```typescript
// v5.7: Corrigir lógica de limpeza de ruído
function cleanOcrNoiseFromName(rawName: string): string {
  const words = rawName.trim().split(/\s+/);
  
  // v5.7: CORREÇÃO - Remove prefixos de ruído MESMO com 2 palavras
  // Só precisa de ao menos 2 palavras (1 prefixo + 1 nome real)
  while (words.length >= 2) {  // Mudou de > 2 para >= 2
    const first = words[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Remove se está na lista de prefixos conhecidos
    // OU tem 2 ou menos caracteres e é alfanumérico puro
    // OU é número puro (documento ID)
    if (
      NOISE_PREFIXES.includes(first) || 
      (first.length <= 2 && /^[A-Z0-9]+$/.test(first)) ||
      /^\d+$/.test(first)
    ) {
      console.log(`🧹 [OCR v5.7] Removendo prefixo: "${words[0]}"`);
      words.shift();
    } else {
      break;
    }
  }
  
  // v5.7: Se sobrou apenas 1 palavra após limpeza, retorna vazio
  // (forçar fallback para "Cliente Não Identificado")
  if (words.length < 2) {
    console.log(`🚫 [OCR v5.7] Nome insuficiente após limpeza: "${words.join(' ')}"`);
    return '';
  }
  
  return words.join(' ');
}
```

### Frente 3: Busca Multi-Critério Aprimorada (policyImportService.ts)

Melhorar `reconcileClient` para buscar por **nome exato (case-insensitive)** ANTES do fuzzy matching:

```typescript
// NOVA FUNÇÃO: Busca por nome EXATO (case insensitive + trim)
async function findClientByNameExact(name: string, userId: string) {
  if (!name || name.length < 3) return null;
  
  const cleanName = name.toLowerCase().trim().replace(/\s+/g, ' ');
  
  const { data, error } = await supabase
    .from('clientes')
    .select('id, name, cpf_cnpj, email, phone')
    .eq('user_id', userId)
    .ilike('name', cleanName)  // Case insensitive exact match
    .limit(1);
  
  if (error || !data?.[0]) return null;
  
  console.log(`✅ [NAME EXACT] Match: "${name}" → "${data[0].name}"`);
  return data[0];
}

// ATUALIZAÇÃO DO FLUXO EM reconcileClient:
export async function reconcileClient(...) {
  // 1. CPF/CNPJ (prioridade máxima) - JÁ EXISTE
  
  // 2. Email exato - JÁ EXISTE
  
  // 3. NOVO: Nome EXATO (case insensitive)
  if (extracted.cliente.nome_completo) {
    const clientByNameExact = await findClientByNameExact(
      extracted.cliente.nome_completo, 
      userId
    );
    if (clientByNameExact) {
      return {
        status: 'matched',
        clientId: clientByNameExact.id,
        clientName: clientByNameExact.name,
        matchedBy: 'name_exact',
      };
    }
  }
  
  // 4. Nome Fuzzy (85%+) - JÁ EXISTE (mantido como fallback)
}
```

### Frente 4: Bloquear Auto-Criação com Nome Inválido

Se o nome extraído falhar na validação, NÃO criar cliente automaticamente. Forçar vinculação manual:

```typescript
// Em upsertClientByDocument
export async function upsertClientByDocument(...) {
  // ... busca existente ...
  
  if (existing) return existing;
  
  // v5.7: NÃO criar se nome é inválido
  const safeName = sanitizeClientName(nome);
  if (safeName === 'Cliente Importado' || safeName === 'Cliente Não Identificado') {
    console.warn(`🚫 [UPSERT v5.7] Bloqueando criação - nome inválido: "${nome}"`);
    return null;  // Força vinculação manual no modal
  }
  
  // Só cria se nome é válido
  const { data: newClient, error } = await supabase.from('clientes').insert({...});
  // ...
}
```

---

## Alterações por Arquivo

| Arquivo | Alteração |
|---------|-----------|
| **SQL (Migration)** | Script para deletar 7 clientes "Ra..." e "Cliente Importado" sem apólices |
| `src/utils/universalPolicyParser.ts` | Corrigir `cleanOcrNoiseFromName` para remover prefixos mesmo com 2 palavras |
| `src/services/policyImportService.ts` | Adicionar `findClientByNameExact()`, bloquear auto-criação com nome inválido |

---

## Fluxo de Vinculação Atualizado

```text
PDF Importado
     │
     ▼
┌─────────────────────────┐
│ 1. Busca por CPF/CNPJ   │ ◀── Match exato (normalizado)
└──────────┬──────────────┘
           │ não encontrou
           ▼
┌─────────────────────────┐
│ 2. Busca por Email      │ ◀── Match exato (ilike)
└──────────┬──────────────┘
           │ não encontrou
           ▼
┌─────────────────────────┐
│ 3. Busca por Nome Exato │ ◀── NOVO: Case insensitive
└──────────┬──────────────┘
           │ não encontrou
           ▼
┌─────────────────────────┐
│ 4. Fuzzy Match (85%+)   │ ◀── Levenshtein distance
└──────────┬──────────────┘
           │ não encontrou
           ▼
┌─────────────────────────┐
│ 5. Criar Novo Cliente   │ ◀── v5.7: Só se nome é VÁLIDO
│    OU Vinculação Manual │     Senão → Modal para editar
└─────────────────────────┘
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| "Ra Marina" criado como novo cliente | Parser remove "Ra", busca "Marina" existente |
| "Cliente Importado" genérico criado | Bloqueia criação, força seleção manual |
| 7 clientes duplicados no banco | Deletados pelo script SQL |
| Dados do PDF ignorados | Telefone/email sincronizados com cliente existente |

---

## Validação Pós-Implementação

1. Executar script SQL de limpeza
2. Importar PDF com cliente EXISTENTE (mesmo nome ou CPF)
3. Verificar no console: `✅ [NAME EXACT] Match encontrado`
4. Confirmar que nenhum cliente novo foi criado
5. Verificar que telefone/email do PDF foram sincronizados

---

## Detalhes Técnicos

### Índices Disponíveis (já existem no banco)

Os seguintes índices já estão criados e serão utilizados:

- `idx_clientes_cpf_cnpj` - Busca por CPF/CNPJ
- `idx_clientes_email` - Busca por email  
- `idx_clientes_name_lower` - Busca por nome (lowercase)
- `idx_clientes_cpf_cnpj_user_unique` - Constraint de unicidade

### Script SQL Completo para Limpeza

```sql
-- Verificação de segurança (deve retornar 0 apólices para todos)
SELECT c.id, c.name, c.cpf_cnpj, COUNT(a.id) as apolices_count 
FROM clientes c 
LEFT JOIN apolices a ON a.client_id = c.id 
WHERE c.name LIKE 'Ra %' 
   OR c.name LIKE 'Cliente Importado%' 
   OR c.name = 'Cliente Não Identificado'
GROUP BY c.id, c.name, c.cpf_cnpj;

-- Deleção segura (apenas clientes sem apólices)
DELETE FROM clientes 
WHERE (
    name LIKE 'Ra %' 
    OR name LIKE 'Cliente Importado%' 
    OR name = 'Cliente Não Identificado'
)
AND id NOT IN (
    SELECT DISTINCT client_id 
    FROM apolices 
    WHERE client_id IS NOT NULL
);
```
