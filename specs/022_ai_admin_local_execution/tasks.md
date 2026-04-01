# Checklist Spec 022 - IA Mestre Executa Localmente

- [x] Entender a rota e o Payload HTTP aceito pela `supabase/functions/ai-assistant`.
- [x] Refatorar o `admin-dispatcher/index.ts` -> `processBatchSession`.
- [x] No `processBatchSession`: em vez de `dispatchAdminToN8n` com o role de LLM genérico, disparar o POST para `ai-assistant` da própria máquina local.
- [x] No POST para `ai-assistant`, embalar o texto OCR e injetar a Flag ou o bloco de "Prompt Consultor" pesado.
- [x] Esperar o Retorno String (`response.text()`) que a `ai-assistant` cuspir usando as CRM tools, God Mode, RAG.
- [x] Pegar o texto brutalmente perfeito formulado pelo AI e despachar via N8N com a Action `action: 'ai_consultant_forwarding'`, cujo corpo vai ser somente a instrução de envio final (formatar para markdown do wpp, e send message via API Chatwoot).
