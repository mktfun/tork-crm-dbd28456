

# Implementacao: Toggle IA por usuario + Dispatcher v2

## Etapa 1 — Migration SQL

Adicionar coluna `ai_enabled` na tabela `profiles`:

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;
```

Tambem adicionar entry no `config.toml` para o `chatwoot-dispatcher` (ja nao existe la):

```toml
[functions.chatwoot-dispatcher]
verify_jwt = false
```

## Etapa 2 — UI: OrganizationUsers.tsx

Adicionar ao componente existente:
- Import `Switch` de `@/components/ui/switch`, `supabase` do client, `useState`, `toast` do sonner
- Adicionar coluna "IA" no `TableHeader` entre "Status" e "Cadastrado em"
- Na interface `User`, adicionar campo `ai_enabled: boolean`
- Renderizar `Switch` com estado local gerenciado por `useState` inicializado com `user.ai_enabled`
- On toggle: chamar `supabase.from('profiles').update({ ai_enabled }).eq('id', user.id)` e toast de confirmacao

## Etapa 3 — Reescrita completa do `chatwoot-dispatcher/index.ts`

Arquitetura do novo dispatcher (~450 linhas):

### 3.1 Helpers

- `resolveUser(assigneeEmail, inboxId)` — resolve `userId`, `brokerageId`, `role`, `ai_enabled` via `profiles`
- `processAttachments(attachments)` — itera `body.attachments[]`, classifica por `content_type`:
  - `audio/*` → fetch URL → base64 → Lovable AI Gateway (Gemini Flash) com prompt de transcricao
  - `image/*` / `application/pdf` → fetch URL → base64 → Gemini Vision OCR
  - Retorna `{ message_type, transcription, extracted_text, attachment_urls }`
- `fetchKnowledgeContext(query)` — chama RPC `match_knowledge` com embedding gerado via Lovable AI Gateway

### 3.2 Fluxo principal

```text
1. Validar evento (message_created + incoming)
2. Resolver user → se ai_enabled=false → return 200 ignorado
3. Manter logica de analysis_sessions (batch mode) para keyword "analisar"/"processar"
4. Processar attachments (audio/img/doc)
5. Decidir modo:
   a) ADMIN → buscar RAG (match_knowledge), montar prompt interno
   b) VENDAS → checar crm_ai_config.is_active
      - Sem deal → prompt generico + tools create_deal/list_pipelines
      - Com deal → buscar stage settings + next_stage (position+1)
6. Montar derived_data completo
7. Enviar para n8n
```

### 3.3 System prompts

**Admin (agente interno):**
```xml
<identity>Assistente Tork - agente interno da corretora</identity>
<capabilities>OCR, RAG, comparacao de coberturas, geracao de textos para clientes</capabilities>
<context>[RAG chunks] [OCR/transcricao dos attachments]</context>
```

**Vendas sem deal:**
```xml
<identity>{{agent_name}} da {{company_name}}</identity>
<objective>Cliente novo. Inferir nas entrelinhas qual produto busca. Usar list_pipelines_and_stages e create_deal ao identificar contexto.</objective>
```

**Vendas com deal:**
```xml
<identity>{{agent_name}}</identity>
<current_context>Deal: X, Stage: Y, Objetivo: Z</current_context>
<auto_progression>Ao concluir objetivo, usar update_deal_stage para next_stage_id. Se ultima etapa, informar que humano assumira.</auto_progression>
```

### 3.4 Next stage query

```sql
SELECT id, name FROM crm_stages 
WHERE pipeline_id = $pipeline_id AND position > $current_position 
ORDER BY position LIMIT 1
```

Se retornar `null` (ultima etapa), o prompt indica "ultima etapa do funil, nao ha proxima etapa automatica".

### 3.5 Payload `derived_data`

```typescript
{
  crm_user_id, brokerage_id, user_role, ai_enabled,
  client_id, deal_id, deal_title, pipeline_id, stage_id, stage_name,
  next_stage_id, next_stage_name,
  ai_is_active, stage_ai_is_active,
  ai_system_prompt,
  agent_name, company_name, voice_tone,
  message_type, original_content, transcription, extracted_text, attachment_urls,
  allowed_tools,
  knowledge_context
}
```

## Arquivos afetados

| Arquivo | Acao |
|---------|------|
| Migration SQL | Adicionar `ai_enabled` ao profiles |
| `supabase/config.toml` | Adicionar entry chatwoot-dispatcher |
| `src/components/superadmin/OrganizationUsers.tsx` | Coluna IA com Switch |
| `supabase/functions/chatwoot-dispatcher/index.ts` | Reescrita completa |

