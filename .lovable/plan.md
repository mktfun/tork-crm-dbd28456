
# Plano: Vínculo por OCR, Categorização de Documento e Dualidade de Arquivos

## Resumo Executivo

Este plano implementa três capacidades fundamentais:
1. **Vínculo Automático por CPF** - Durante a importação, o sistema busca clientes pelo CPF extraído e vincula automaticamente
2. **Categorização de Documento** - Detecta se é APÓLICE ou CARTEIRINHA e processa adequadamente
3. **Dualidade de Arquivos** - Uma apólice pode ter dois slots: `pdf_url` (apólice) e `carteirinha_url` (carteirinha)

---

## 1. Database / SQL

### 1.1 Alterações na Tabela `apolices`

Adicionar novos campos para suportar carteirinha e metadados de tipo:

```sql
-- Adicionar campos de suporte a múltiplos documentos
ALTER TABLE public.apolices 
ADD COLUMN IF NOT EXISTS carteirinha_url text,
ADD COLUMN IF NOT EXISTS last_ocr_type text;

-- Comentários para documentação
COMMENT ON COLUMN public.apolices.carteirinha_url IS 'URL do arquivo de carteirinha no storage';
COMMENT ON COLUMN public.apolices.last_ocr_type IS 'Tipo do último documento processado: apolice ou carteirinha';
```

### 1.2 Índice para Busca por CPF

Criar índice para acelerar a busca de clientes (vínculo automático):

```sql
-- Índice para busca rápida de clientes por CPF/CNPJ
CREATE INDEX IF NOT EXISTS idx_clientes_cpf_cnpj ON public.clientes (cpf_cnpj);
```

---

## 2. Edge Function (`analyze-policy/index.ts`)

### 2.1 Atualizar SYSTEM_PROMPT

Modificar o prompt do Gemini para detectar o tipo de documento:

**Localização:** Linhas 22-60

```text
## DETECÇÃO DE TIPO DE DOCUMENTO:

Antes de extrair, identifique o TIPO:

1. **APOLICE** - Documento completo de seguro:
   - Contém "Condições Gerais", "Prêmio", "Vigência", "Coberturas"
   - Dados financeiros detalhados
   - Número da apólice/proposta

2. **CARTEIRINHA** - Documento de identificação de beneficiário:
   - Termos: "Beneficiário", "Cartão", "Rede de Atendimento"
   - Número de matrícula/carteirinha
   - Operadora de saúde
   - SEM dados financeiros

Retorne o campo `tipo_documento`: "APOLICE" ou "CARTEIRINHA"

Para CARTEIRINHA, extraia:
- titular_cpf: CPF do titular (CRÍTICO - apenas dígitos)
- numero_carteirinha: número de identificação
- operadora: nome da operadora de saúde
- validade_cartao: data de validade (YYYY-MM-DD)
```

### 2.2 Atualizar Response Schema

Adicionar campos de carteirinha no schema de resposta:

**Localização:** Linhas 154-172

```typescript
responseSchema: {
  type: 'object',
  properties: {
    // ... campos existentes ...
    tipo_documento: { 
      type: 'string', 
      nullable: true, 
      description: 'APOLICE ou CARTEIRINHA' 
    },
    numero_carteirinha: { 
      type: 'string', 
      nullable: true, 
      description: 'Número de identificação do beneficiário' 
    },
    operadora: { 
      type: 'string', 
      nullable: true, 
      description: 'Operadora de saúde' 
    },
    validade_cartao: { 
      type: 'string', 
      nullable: true, 
      description: 'Validade do cartão (YYYY-MM-DD)' 
    },
  },
},
```

### 2.3 Atualizar Objeto `cleaned`

Incluir novos campos no retorno:

**Localização:** Linhas 217-233

```typescript
const cleaned = {
  // ... campos existentes ...
  tipo_documento: extracted.tipo_documento || 'APOLICE',
  numero_carteirinha: extracted.numero_carteirinha || null,
  operadora: extracted.operadora || null,
  validade_cartao: extracted.validade_cartao || null,
};
```

---

## 3. Types (`src/types/policyImport.ts`)

### 3.1 Expandir DocumentType

**Localização:** Linha 37

```typescript
export type DocumentType = 'APOLICE' | 'PROPOSTA' | 'ORCAMENTO' | 'ENDOSSO' | 'CARTEIRINHA';
```

### 3.2 Adicionar Interface CarteirinhaData

```typescript
export interface CarteirinhaData {
  numero_carteirinha: string | null;
  operadora: string | null;
  titular_cpf: string | null;
  validade_cartao: string | null;
}
```

### 3.3 Expandir PolicyImportItem

Adicionar campos para carteirinha:

```typescript
export interface PolicyImportItem {
  // ... campos existentes ...
  
  // NOVOS CAMPOS - Carteirinha
  isCarteirinha?: boolean;
  carteirinhaData?: CarteirinhaData;
  targetPolicyId?: string; // ID da apólice para vincular carteirinha
}
```

### 3.4 Expandir BulkOCRExtractedPolicy

```typescript
export interface BulkOCRExtractedPolicy {
  // ... campos existentes ...
  
  // NOVOS CAMPOS - Carteirinha
  numero_carteirinha: string | null;
  operadora: string | null;
  validade_cartao: string | null;
}
```

---

## 4. Service (`src/services/policyImportService.ts`)

### 4.1 Nova Função: `linkCarteirinhaToPolicy`

Função para vincular carteirinha a uma apólice existente:

```typescript
/**
 * Vincula uma carteirinha a uma apólice existente
 * 1. Faz upload do arquivo para storage
 * 2. Atualiza o campo carteirinha_url na apólice
 */
export async function linkCarteirinhaToPolicy(
  policyId: string,
  carteirinhaFile: File,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // 1. Upload para storage
    const path = `carteirinhas/${userId}/${policyId}/${Date.now()}_${carteirinhaFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('policy-docs')
      .upload(path, carteirinhaFile, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    // 2. Obter URL pública
    const { data: urlData } = supabase.storage
      .from('policy-docs')
      .getPublicUrl(path);
    
    // 3. Atualizar apólice com URL da carteirinha
    const { error: updateError } = await supabase
      .from('apolices')
      .update({ 
        carteirinha_url: urlData.publicUrl,
        last_ocr_type: 'carteirinha'
      })
      .eq('id', policyId)
      .eq('user_id', userId);
    
    if (updateError) throw updateError;
    
    console.log(`✅ [CARTEIRINHA] Vinculada à apólice ${policyId}`);
    return { success: true, url: urlData.publicUrl };
  } catch (error) {
    console.error('❌ [CARTEIRINHA] Erro ao vincular:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}
```

### 4.2 Nova Função: `findHealthPoliciesByClient`

Buscar apólices de saúde de um cliente para vincular carteirinha:

```typescript
/**
 * Busca apólices de saúde de um cliente para vincular carteirinha
 */
export async function findHealthPoliciesByClient(
  clientId: string,
  userId: string
): Promise<{ id: string; policy_number: string | null; insured_asset: string | null; company_name: string | null }[]> {
  const { data, error } = await supabase
    .from('apolices')
    .select(`
      id,
      policy_number,
      insured_asset,
      companies:insurance_company(name)
    `)
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .or('type.ilike.%saude%,type.ilike.%saúde%,type.ilike.%vida%')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Erro ao buscar apólices de saúde:', error);
    return [];
  }
  
  return (data || []).map(p => ({
    id: p.id,
    policy_number: p.policy_number,
    insured_asset: p.insured_asset,
    company_name: p.companies?.name || null
  }));
}
```

---

## 5. Frontend (`src/components/policies/ImportPoliciesModal.tsx`)

### 5.1 Detectar Tipo de Documento no Processamento

No callback de processamento do arquivo, identificar se é carteirinha:

**Localização:** Função de processamento de arquivos (após OCR)

```typescript
// Detectar se é carteirinha
const isCarteirinha = extractedData.tipo_documento === 'CARTEIRINHA';

if (isCarteirinha) {
  // Buscar cliente pelo CPF do titular
  const titularCpf = extractedData.cpf_cnpj || extractedData.titular_cpf;
  
  if (titularCpf) {
    const client = await findClientByCpfCnpj(titularCpf, userId);
    
    if (client) {
      // Buscar apólices de saúde deste cliente
      const healthPolicies = await findHealthPoliciesByClient(client.id, userId);
      
      // Armazenar no item para seleção na UI
      item.isCarteirinha = true;
      item.clientId = client.id;
      item.healthPolicies = healthPolicies;
      item.carteirinhaData = {
        numero_carteirinha: extractedData.numero_carteirinha,
        operadora: extractedData.operadora,
        titular_cpf: titularCpf,
        validade_cartao: extractedData.validade_cartao,
      };
    }
  }
}
```

### 5.2 UI de Seleção de Apólice para Carteirinha

No componente `ReviewTableRow`, mostrar seletor quando é carteirinha:

```tsx
{/* Badge indicando tipo de documento */}
{item.isCarteirinha && (
  <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30">
    📇 Carteirinha
  </Badge>
)}

{/* Seletor de apólice para vincular */}
{item.isCarteirinha && item.healthPolicies && item.healthPolicies.length > 0 && (
  <TableCell className="py-3">
    <Select
      value={item.targetPolicyId || ''}
      onValueChange={(val) => updateItem(item.id, { targetPolicyId: val })}
    >
      <SelectTrigger className="w-48 bg-zinc-800/50 border-zinc-700">
        <SelectValue placeholder="Vincular à apólice..." />
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-700">
        {item.healthPolicies.map(policy => (
          <SelectItem key={policy.id} value={policy.id}>
            {policy.policy_number || policy.insured_asset || 'Apólice'}
            {policy.company_name && ` - ${policy.company_name}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </TableCell>
)}
```

### 5.3 Lógica de Salvamento para Carteirinha

No handler de salvamento, tratar carteirinha de forma diferente:

```typescript
// Se for carteirinha, vincular à apólice existente
if (item.isCarteirinha && item.targetPolicyId) {
  const result = await linkCarteirinhaToPolicy(
    item.targetPolicyId,
    item.file,
    userId
  );
  
  if (result.success) {
    successCount++;
    toast.success(`Carteirinha vinculada com sucesso!`);
  } else {
    errorCount++;
    toast.error(`Erro ao vincular carteirinha: ${result.error}`);
  }
  continue; // Não criar apólice nova
}

// Fluxo normal para apólices...
```

---

## 6. UI de Detalhes (`src/pages/PolicyDetails.tsx`)

### 6.1 Adicionar Botão de Visualização Dual

Modificar a seção de botões de PDF para mostrar ambos os documentos:

**Localização:** Linhas 443-469 (seção de PDF)

```tsx
{/* Visualização Dual de Documentos */}
<div className="space-y-2">
  {/* Botão Ver Apólice */}
  {(policy.pdfAnexado || policy.pdfUrl) && (
    <Button 
      variant="outline" 
      className="w-full" 
      onClick={() => {
        if (policy.pdfAnexado) {
          handleDownloadPdf();
        } else if (policy.pdfUrl) {
          window.open(policy.pdfUrl, '_blank');
        }
      }}
    >
      <FileText className="w-4 h-4 mr-2" />
      Ver Apólice
    </Button>
  )}
  
  {/* Botão Ver Carteirinha */}
  {policy.carteirinhaUrl ? (
    <Button 
      variant="outline" 
      className="w-full border-teal-500/30 text-teal-400 hover:bg-teal-500/10" 
      onClick={() => window.open(policy.carteirinhaUrl, '_blank')}
    >
      <CreditCard className="w-4 h-4 mr-2" />
      Ver Carteirinha
    </Button>
  ) : (
    <div>
      <label htmlFor="carteirinha-upload">
        <Button asChild variant="outline" className="w-full border-dashed border-zinc-600">
          <span className="cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Anexar Carteirinha
          </span>
        </Button>
      </label>
      <input
        id="carteirinha-upload"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleCarteirinhaUpload}
        className="hidden"
      />
    </div>
  )}
</div>
```

### 6.2 Função de Upload de Carteirinha

Adicionar handler para upload manual de carteirinha:

```typescript
const handleCarteirinhaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file || !policy || !user) return;
  
  // Validar tipo (PDF ou imagem)
  const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    toast({ title: 'Erro', description: 'Formato inválido. Use PDF, JPG ou PNG.', variant: 'destructive' });
    return;
  }
  
  try {
    const result = await linkCarteirinhaToPolicy(policy.id, file, user.id);
    
    if (result.success) {
      toast({ title: 'Sucesso', description: 'Carteirinha anexada com sucesso!' });
      // Recarregar dados
      window.location.reload();
    } else {
      toast({ title: 'Erro', description: result.error || 'Erro ao anexar carteirinha', variant: 'destructive' });
    }
  } catch (error) {
    toast({ title: 'Erro', description: 'Erro ao anexar carteirinha', variant: 'destructive' });
  }
};
```

### 6.3 Adicionar Import do CreditCard Icon

No topo do arquivo, adicionar o ícone:

```typescript
import { ..., CreditCard } from 'lucide-react';
```

---

## 7. Interface Policy (`src/types/index.ts`)

### 7.1 Adicionar Campo carteirinhaUrl

**Localização:** Interface Policy (linhas 28-79)

```typescript
export interface Policy {
  // ... campos existentes ...
  
  // NOVOS CAMPOS - Carteirinha
  carteirinhaUrl?: string;  // URL da carteirinha no storage
  lastOcrType?: 'apolice' | 'carteirinha'; // Tipo do último OCR
}
```

---

## 8. Hooks de Dados

### 8.1 Atualizar `useSupabasePolicies.ts`

Incluir novos campos na query:

```typescript
.select(`
  *,
  carteirinha_url,
  last_ocr_type,
  companies:insurance_company(id, name),
  ramos:ramo_id(id, nome)
`)
```

E no mapeamento:

```typescript
const mapPolicy = (p: any): Policy => ({
  // ... campos existentes ...
  carteirinhaUrl: p.carteirinha_url,
  lastOcrType: p.last_ocr_type,
});
```

---

## 9. Resumo de Arquivos a Modificar

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| **SQL Migration** | Novos campos `carteirinha_url`, `last_ocr_type`, índice CPF |
| `supabase/functions/analyze-policy/index.ts` | Prompt para detectar CARTEIRINHA, novos campos |
| `src/types/policyImport.ts` | Expandir `DocumentType`, nova interface `CarteirinhaData` |
| `src/types/index.ts` | Novos campos em `Policy` |
| `src/services/policyImportService.ts` | Novas funções `linkCarteirinhaToPolicy`, `findHealthPoliciesByClient` |
| `src/components/policies/ImportPoliciesModal.tsx` | Detecção de carteirinha, UI de seleção |
| `src/pages/PolicyDetails.tsx` | Botões duais (Apólice/Carteirinha), upload manual |
| `src/hooks/useSupabasePolicies.ts` | Query e mapeamento dos novos campos |

---

## 10. Fluxo de Usuário Final

```text
FLUXO 1: Importação de Apólice
┌─────────────────────────────────────────────┐
│ 1. Upload PDF                               │
│ 2. IA detecta: tipo_documento = "APOLICE"   │
│ 3. Extrai CPF do segurado                   │
│ 4. Busca cliente no banco                   │
│    └─ Se existe → Vincula automaticamente   │
│    └─ Se não existe → Sugere criar          │
│ 5. Salva apólice normalmente                │
└─────────────────────────────────────────────┘

FLUXO 2: Importação de Carteirinha
┌─────────────────────────────────────────────┐
│ 1. Upload PDF/Imagem                        │
│ 2. IA detecta: tipo_documento = "CARTEIRINHA│
│ 3. Extrai CPF do titular                    │
│ 4. Busca cliente pelo CPF                   │
│ 5. Busca apólices de SAÚDE do cliente       │
│ 6. Mostra seletor: "Vincular à apólice..."  │
│ 7. Corretor seleciona a apólice             │
│ 8. Sistema faz UPDATE no campo carteirinha_ │
│    url da apólice selecionada               │
└─────────────────────────────────────────────┘

FLUXO 3: Visualização em PolicyDetails
┌─────────────────────────────────────────────┐
│ Detalhes da Apólice                         │
│ ┌─────────────┐ ┌─────────────┐             │
│ │ Ver Apólice │ │Ver Carteiri.│             │
│ └─────────────┘ └─────────────┘             │
│                                             │
│ Se não tem carteirinha:                     │
│ ┌─────────────────────────────┐             │
│ │ 📤 Anexar Carteirinha       │             │
│ └─────────────────────────────┘             │
└─────────────────────────────────────────────┘
```

---

## 11. Testes de Validação

### Teste 1: Vínculo Automático
1. Importe PDF de apólice com CPF cadastrado no CRM
2. Verifique se a apólice aparece vinculada ao cliente correto
3. Log esperado: `✅ [CPF/CNPJ EXACT] Match encontrado: Nome do Cliente`

### Teste 2: Detecção de Carteirinha
1. Importe imagem de carteirinha de plano de saúde
2. Verifique se Badge "📇 Carteirinha" aparece
3. Verifique se seletor de apólice é exibido

### Teste 3: Vínculo de Carteirinha
1. Selecione a apólice no dropdown
2. Clique em Salvar
3. Verifique se campo `carteirinha_url` foi preenchido no banco

### Teste 4: Visualização Dual
1. Acesse `/policies/[id]` de uma apólice com carteirinha
2. Confirme que ambos os botões aparecem
3. Clique em cada um e confirme que abrem os documentos corretos
