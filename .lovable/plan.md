
Do I know what the issue is? Sim.

## Diagnóstico confirmado (com evidência)

1. A aba está quebrando porque `AutomationConfigTab` consulta/atualiza colunas que **não existem** em `brokerages`:
   - `n8n_webhook_url`
   - `chatwoot_webhook_secret`
   Isso gera 400 (`column brokerages.n8n_webhook_url does not exist`) e quebra save/load.

2. O teste usa config antiga porque `chatwoot-sync` lê somente `brokerages`, e lá está salvo:
   - `https://chat.davicode.me/`
   enquanto em `crm_settings` já existe URL nova.
   Resultado: teste chama domínio antigo e falha com DNS.

3. Há bug de normalização de URL (`...me//api/v1...`) por concatenação com barra final.

## Plano de correção (passo a passo)

### 1) Consertar a aba “Configurações” (fonte de dados correta)
**Arquivo:** `src/components/automation/AutomationConfigTab.tsx`

- Separar leitura em 2 queries:
  - `brokerages`: `id, user_id, chatwoot_url, chatwoot_token, chatwoot_account_id, updated_at`
  - `crm_settings`: `id, chatwoot_url, chatwoot_api_key, chatwoot_account_id, chatwoot_webhook_secret, n8n_webhook_url, updated_at`
- Remover `n8n_webhook_url` e `chatwoot_webhook_secret` de qualquer select/update em `brokerages`.
- Save em duas partes:
  - Atualiza `brokerages` com credenciais Chatwoot (url/token/account_id).
  - Atualiza/insere `crm_settings` com webhook secret + n8n + espelho das credenciais.
- Exibir erro real no toast (não genérico), para troubleshooting imediato.
- Sanitizar URL antes de salvar (trim, remover `/api/v1`, remover barras finais).

### 2) Fazer o teste usar o valor atual da tela (não ficar preso no antigo)
**Arquivos:**  
- `src/components/automation/AutomationConfigTab.tsx`
- `supabase/functions/chatwoot-sync/index.ts`

- Em `handleTestChatwoot` e `handleSyncLabels`, enviar `config_override` no body (`chatwoot_url`, `chatwoot_api_key`, `chatwoot_account_id`).
- No `chatwoot-sync`, priorizar `config_override` quando vier completo.
- Se não vier override, buscar brokerages + crm_settings e escolher config válida mais recente (`updated_at`), com fallback de compatibilidade.

### 3) Auto-correção de dados para remover config velha
**Arquivo novo:** `supabase/migrations/<timestamp>_sync_chatwoot_config.sql`

- Rodar update de sincronização:
  - quando `crm_settings` estiver mais novo/diferente, copiar para `brokerages`.
- Isso corrige imediatamente o caso atual (URL velha em brokerages) e evita reincidência após deploy.

### 4) Hardening da edge function para erro de DNS e URL
**Arquivo:** `supabase/functions/chatwoot-sync/index.ts`

- Normalizar URL internamente antes de montar endpoint.
- Padronizar concatenação para nunca gerar `//api/v1`.
- Melhorar mensagem de erro para DNS/host inválido:
  - “Domínio do Chatwoot não resolvido. Verifique se a URL está correta e pública.”

### 5) Validação pós-fix (fim-a-fim)
- Abrir aba de Configurações e confirmar que não há mais 400 no GET.
- Salvar credenciais e confirmar 200 nos updates.
- Clicar “Testar Conexão” e garantir que a chamada não usa mais `chat.davicode.me`.
- Clicar “Sincronizar Etiquetas” com mesma origem de config.
- Confirmar no banco que `brokerages.chatwoot_*` e `crm_settings.chatwoot_*` ficaram alinhados.

## Detalhes técnicos (resumo de implementação)

- **Sem alterar schema de `brokerages`** para n8n/webhook secret (não existe hoje e causou o erro).
- **Compatibilidade mantida** com `crm_settings` (já usado por outras telas).
- **Fonte operacional para chatwoot-sync** continua suportando multi-tenant via `brokerages`, mas com fallback inteligente e override no teste.
- **Arquivos impactados:**
  - `src/components/automation/AutomationConfigTab.tsx`
  - `supabase/functions/chatwoot-sync/index.ts`
  - `supabase/migrations/<timestamp>_sync_chatwoot_config.sql`

## Resultado esperado

- Aba deixa de quebrar.
- Save volta a funcionar.
- Teste/sync param de usar config antiga.
- Erro DNS antigo desaparece (desde que URL digitada esteja correta).
- Fluxo de automação fica estável e previsível.
