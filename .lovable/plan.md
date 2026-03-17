

# Plano: Refatoração Chat UI + Painel Motor de IA

## Etapa 1 — Migration SQL

Adicionar colunas de roteamento LLM na tabela `crm_ai_global_config`:

```sql
ALTER TABLE public.crm_ai_global_config 
ADD COLUMN IF NOT EXISTS ai_provider text DEFAULT 'gemini',
ADD COLUMN IF NOT EXISTS ai_model text DEFAULT 'gemini-2.0-flash',
ADD COLUMN IF NOT EXISTS api_key text;
```

## Etapa 2 — AISandbox.tsx: Chat com Card + ScrollArea + Avatar

Refatorar o componente para usar primitivas shadcn/ui:

- Envolver tudo em `<Card className="flex flex-col h-full">` com `CardHeader` para o header existente e `CardContent` para o corpo
- Substituir a `div` de scroll (`overflow-y-auto`) por `<ScrollArea className="flex-1">`
- Cada mensagem de IA: `<Avatar>` com `<AvatarFallback className="bg-primary/10"><Bot className="text-primary" /></AvatarFallback>` alinhado à esquerda
- Cada mensagem do usuário: `<Avatar>` com `<AvatarFallback><User /></AvatarFallback>` alinhado à direita
- Input fixo no footer do Card com `<Input>` + `<Button size="icon"><Send /></Button>`

Estrutura geral mantida, apenas troca de primitivas para consistência visual com Glass theme.

## Etapa 3 — AutomationConfigTab.tsx: Card "Motor de Inteligência"

Adicionar um novo `<Card>` no topo do layout (antes do Chatwoot card, após o header), contendo:

- **Select "Provedor de IA"**: opções `gemini` (Google Gemini) e `openai` (OpenAI)
- **Select "Modelo"**: reativo ao provedor:
  - Gemini: `gemini-2.0-flash`, `gemini-2.0-pro`, `gemini-1.5-pro`
  - OpenAI: `gpt-4.5`, `gpt-4o`
- **Input type="password"** para API Key com toggle eye
- Estado adicional: `aiProvider`, `aiModel`, `aiApiKey`
- No `fetchSettings`: carregar também de `crm_ai_global_config` os campos `ai_provider`, `ai_model`, `api_key`
- No `handleSave`: incluir `supabase.from('crm_ai_global_config').update({ ai_provider, ai_model, api_key }).eq('user_id', user.id)` + toast

Layout do card em grid 2 colunas: Provedor | Modelo na primeira linha, API Key (col-span-2) na segunda.

## Etapa 4 — Atualizar tipos Supabase

Adicionar `ai_provider`, `ai_model`, `api_key` nos tipos gerados de `crm_ai_global_config`.

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| Migration SQL | `ai_provider`, `ai_model`, `api_key` em `crm_ai_global_config` |
| `src/components/automation/AISandbox.tsx` | Card + ScrollArea + Avatar |
| `src/components/automation/AutomationConfigTab.tsx` | Card "Motor de IA" com selects reativos |
| `src/integrations/supabase/types.ts` | Novos campos |

