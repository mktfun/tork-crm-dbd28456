

# Plano: Corrigir bugs da IA (2 erros)

## Erro 1 — `Duplicate function declaration: analyze_client_360` (400)

A tool `analyze_client_360` está declarada **duas vezes** no array de tools:
- Primeira: linha 879-892 (seção ANALYTICS)
- Duplicata: linhas 1139-1152 (depois das tools CRUD)

A API do Gemini rejeita tools duplicadas com erro 400.

**Correção**: Remover o bloco duplicado (linhas 1139-1152).

## Erro 2 — RAG Embedding 404 (`text-embedding-004 not found`)

O modelo `text-embedding-004` não existe mais na API v1beta do Gemini. Preciso verificar qual endpoint/modelo está sendo usado e atualizar.

**Correção**: Localizar a chamada de embedding e atualizar o modelo para `text-embedding-005` ou o equivalente atual.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/ai-assistant/index.ts` | Remover declaração duplicada de `analyze_client_360` (linhas 1139-1152) |
| Arquivo de RAG/embedding (a localizar) | Atualizar modelo de embedding |

