# Checklist Spec 023 - Roteamento de OCR e Override N8N

- [x] No `extract-quote-data/index.ts`, ajustar a extração do Bearer Token para permitir autenticação via `SUPABASE_SERVICE_ROLE_KEY` + `userId` injetado no corpo, facilitando invocações internas de microsserviços.
- [x] No `admin-dispatcher/index.ts`, alterar a assinatura do `processAttachments` para receber `userId`.
- [x] No `admin-dispatcher/index.ts`, refatorar o laço que itera sobre anexos: tentar `extract-quote-data` primeiro, parsear o JSON retornado para texto bruto elegante se tiver sucesso.
- [x] Adicionar o fallback: se e somente se o `extract-quote-data` falhar, invocar a função `extract-document` atual (OCR Genérico Gemini).
- [x] Substituir a chave `content` original na raiz do JSON despachado pro N8N com a Análise gerada pela IA, enganando o N8N para crer que o usuário ativamente digitou aquilo no Chatwoot (e mantendo `ai_admin_message` vivo).
