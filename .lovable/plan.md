

# Plano: Admin Dispatcher Dedicado + Modo Análise com `/analise` e `/start`

## Resumo

Criar uma edge function dedicada (`admin-dispatcher`) que o `chatwoot-dispatcher` invoca quando detecta `role === 'admin'`. Essa função terá um system prompt completo no estilo do `ai-assistant` (com tools, rules, modos de operação, RAG) e um modo de análise batch melhorado com comandos `/analise` e `/start`.

## Arquitetura

```text
chatwoot-dispatcher (index.ts)
  ├── role === 'admin' ?
  │     └── invoca admin-dispatcher (nova edge function)
  │           ├── Verifica /analise → inicia sessão batch
  │           ├── Verifica /start → processa sessão batch
  │           ├── Sessão ativa? → acumula mensagem/anexo
  │           └── Normal → responde com system prompt admin + tools
  └── role !== 'admin'
        └── fluxo sales normal (atual)
```

## Mudanças

### 1. Nova Edge Function: `supabase/functions/admin-dispatcher/index.ts`

Função dedicada que recebe o payload do dispatcher e:

- **Batch mode (`/analise`)**: Cria sessão `ai_analysis_sessions` com `expires_at` = 2 min. Responde via Chatwoot: "📥 Modo análise ativado. Envie documentos, áudios e mensagens. Envie `/start` para processar ou aguarde 2 minutos."
- **Acumulação**: Se sessão ativa, processa anexos (OCR/transcrição) e acumula no `collected_data` com `expires_at` renovado para +2 min
- **Trigger (`/start` ou expiração)**: Monta um megaprompt com todo o conteúdo acumulado (transcrições, OCRs, textos) e despacha para n8n com o system prompt admin completo
- **Modo normal** (sem sessão ativa, sem `/analise`): Despacha direto para n8n com system prompt admin + tools

**System prompt admin** será inspirado no `ai-assistant` e incluirá:
- `<identity>` com Assistente Tork
- `<rules>` com prioridades (grounding, autonomia, confirmação de deleção)
- `<tools_guide>` listando as tools disponíveis no n8n (search_contact, create_contact, create_deal, update_deal_stage, list_pipelines_and_stages, rag_search)
- `<modos_operacao>` (consultoria pura, agente com dados, híbrido)
- `<format_instruction>` para formatação WhatsApp-friendly
- `<CRITICAL_SECURITY_RULES>`
- Injeção de contexto temporal, KPIs resumidos, e RAG context quando disponível
- Transcrições e documentos extraídos inline

### 2. Atualizar `chatwoot-dispatcher/index.ts`

- Quando `role === 'admin'`, em vez de processar inline, invocar `supabase.functions.invoke('admin-dispatcher', { body: enrichedPayload })`
- O enrichedPayload inclui: body original + userId, brokerageId, role, resolvedAI, mediaResult
- Remover a lógica de análise session inline (blocos "analisar"/"processar") que migra para o admin-dispatcher

### 3. Atualizar `process-analysis-session/index.ts`

- Melhorar para realmente processar os attachments acumulados (OCR/transcrição) em vez de apenas concatenar texto
- Montar o system prompt admin completo com todo o conteúdo extraído
- Enviar para n8n com `derived_data.ai_system_prompt` completo

### 4. Migração SQL (se necessário)

- Adicionar coluna `session_type` na tabela `ai_analysis_sessions` para distinguir sessões batch admin vs futuras sessões de outros tipos (opcional, pode usar campo existente)

## Detalhes do batch mode

| Comando | Ação |
|---------|------|
| `/analise` | Cria sessão batch. Timer de 2 min. Mensagem de confirmação via Chatwoot |
| Mensagem/anexo durante sessão | Processa mídia (OCR/transcrição), acumula em `collected_data`, renova timer |
| `/start` | Marca sessão como `ready_for_processing`, processa tudo junto |
| Expiração (2 min sem mensagem) | `check-followups` ou cron detecta e processa automaticamente |

## Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/admin-dispatcher/index.ts` | **Criar** — nova edge function dedicada |
| `supabase/functions/chatwoot-dispatcher/index.ts` | **Editar** — delegar admin para admin-dispatcher |
| `supabase/functions/process-analysis-session/index.ts` | **Editar** — melhorar processamento real de mídia |
| `supabase/functions/chatwoot-dispatcher/modules/buildPrompt.ts` | **Editar** — extrair o system prompt admin para reutilização |

