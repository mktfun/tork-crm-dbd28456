

# Plano: Corrigir System Prompt do Dispatcher e Motor de IA do Dashboard

## Problema 1 — Dispatcher envia prompt genérico para contatos sem deal

No `buildSystemPrompt`, quando não há deal (linha 246), o código tenta usar `stageAiSettings?.ai_persona` — mas `stageAiSettings` é **sempre null** nesse cenário porque nenhuma etapa foi encontrada. O fallback é uma string hardcoded mínima: `"Você é um assistente de vendas útil e amigável."`.

O correto é usar o `base_instructions` da configuração global (`crm_ai_global_config`), que é o prompt completo configurado na tela de automação. O `globalConfig` já é carregado na função (linha 188-198) mas só extrai `agent_name`, `company_name` e `voice_tone` — ignora `base_instructions`.

### Correção

- Extrair `base_instructions` do `globalConfig` junto com os outros campos (linha 194-197).
- Na seção "no deal" (linha 246), usar `globalConfig.base_instructions` como persona principal em vez de `stageAiSettings?.ai_persona`.
- Manter o fallback hardcoded apenas se `base_instructions` também estiver vazio.

---

## Problema 2 — `generate-summary` usa LOVABLE_API_KEY em vez da IA configurada

A Edge Function `generate-summary` já usa `resolveUserModel()` para pegar o modelo correto da `crm_ai_global_config`, mas sempre autentica com `LOVABLE_API_KEY` (Lovable Gateway). O usuário configurou sua própria API key na tela de automação (`crm_ai_global_config.api_key`), e essa key deve ser usada.

### Correção

- Atualizar `model-resolver.ts` para retornar também a `api_key` do usuário (além do modelo).
- No `generate-summary`, usar a API key do usuário quando disponível, com fallback para `LOVABLE_API_KEY`.
- Mesma lógica: se o usuário tem key própria configurada → usa ela. Se não → Lovable Gateway.

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/chatwoot-dispatcher/index.ts` | Usar `base_instructions` do globalConfig como persona para contatos sem deal |
| `supabase/functions/_shared/model-resolver.ts` | Retornar também `api_key` do usuário |
| `supabase/functions/generate-summary/index.ts` | Usar API key do usuário quando configurada |

## Deploy necessário

Após as alterações, será preciso fazer deploy das 3 Edge Functions afetadas.

