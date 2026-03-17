

# Plano: Produtores e Corretoras como Admins Automáticos pelo Telefone

## Contexto

O pedido é: quando uma mensagem chega no Chatwoot, se o telefone do remetente pertence a um **produtor** ou ao dono de uma **corretora**, ele deve ser tratado automaticamente como `admin` no dispatcher — sem configuração manual.

A tabela `producers` já tem coluna `phone`. A tabela `brokerages` **não** tem `phone`, mas tem `user_id` que referencia o dono (profile), e profiles tem email (usado para resolver no Chatwoot). Precisamos adicionar `phone` em `brokerages`.

## Etapas

### 1. Migration SQL — Adicionar `phone` em `brokerages` + `ai_enabled` em `clientes`

```sql
ALTER TABLE public.brokerages ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;
```

### 2. Schema Zod — Telefone obrigatório

**`src/schemas/producerSchema.ts`**: Alterar `phone` de `z.string().optional()` para `z.string().min(10, 'Telefone é obrigatório para roteamento')`.

**`src/components/configuracoes/GestaCorretoras.tsx`**: Adicionar campo `phone` ao `brokerageSchema` como `z.string().min(10, 'Telefone é obrigatório')`. Adicionar input no formulário com asterisco e exibição de erro Zod. Atualizar `defaultValues` e `handleEdit`.

### 3. Dispatcher — Auto-detecção de admin por telefone

No `chatwoot-dispatcher/index.ts`, **após** resolver o user (step 2) e **antes** da lógica de analysis sessions (step 3), adicionar uma nova etapa de "role override":

```typescript
// 2.5 — Check if sender is a producer or brokerage owner (auto-admin)
const senderPhone = sender?.phone_number?.replace(/\D/g, '')
if (senderPhone && role !== 'admin') {
  // Check producers table
  const { data: producer } = await supabase
    .from('producers')
    .select('id, brokerage_id')
    .ilike('phone', `%${senderPhone}%`)
    .maybeSingle()
  
  if (producer) {
    role = 'admin'  // Override to admin mode
    if (!brokerageId) brokerageId = producer.brokerage_id
    console.log('👑 Sender is a producer → admin mode')
  } else {
    // Check brokerages table
    const { data: brokerage } = await supabase
      .from('brokerages')
      .select('id, user_id')
      .ilike('phone', `%${senderPhone}%`)
      .maybeSingle()
    
    if (brokerage) {
      role = 'admin'
      if (!brokerageId) brokerageId = brokerage.id
      if (!userId) userId = brokerage.user_id
      console.log('👑 Sender is a brokerage owner → admin mode')
    }
  }
}
```

Isso garante que qualquer produtor ou dono de corretora que mandar mensagem do próprio número é tratado como admin automaticamente — recebe RAG, OCR, análise técnica, etc.

### 4. UI — Toggle IA na listagem de clientes

**`src/components/clients/ClientListView.tsx`**: Adicionar coluna "IA" com `Switch` que faz `supabase.from('clientes').update({ ai_enabled }).eq('id', client.id)` + toast.

**`src/components/clients/ClientRowCard.tsx`**: Adicionar Switch de IA no card.

### 5. Dispatcher — Guard de `ai_enabled` do cliente

Na seção 5 do dispatcher (resolve client), alterar `.select('id')` para `.select('id, ai_enabled')` e adicionar guard:

```typescript
const clientAiEnabled = clientData?.ai_enabled ?? true
if (!clientAiEnabled && role !== 'admin') {
  return new Response(JSON.stringify({ message: 'IA desativada para este cliente' }), { status: 200 })
}
```

### 6. Tipos — Atualizar interface Client

Adicionar `ai_enabled?: boolean` na interface `Client` em `src/types/index.ts`.

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| Migration SQL | `phone` em brokerages + `ai_enabled` em clientes |
| `src/schemas/producerSchema.ts` | `phone` obrigatório |
| `src/components/configuracoes/GestaCorretoras.tsx` | Campo `phone` obrigatório no form |
| `src/components/configuracoes/GestaoProdutores.tsx` | Label com asterisco |
| `src/types/index.ts` | `ai_enabled` na interface Client |
| `src/components/clients/ClientListView.tsx` | Coluna IA com Switch |
| `src/components/clients/ClientRowCard.tsx` | Switch IA no card |
| `supabase/functions/chatwoot-dispatcher/index.ts` | Auto-admin por telefone + guard ai_enabled |

