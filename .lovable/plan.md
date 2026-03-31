

# Plano: Remover mensagens duplicadas do admin-dispatcher

## Problema

O admin-dispatcher envia mensagens hardcoded via `sendChatwootMessage` para cada comando:
- `/reset` → linha 417: envia "🔄 Histórico limpo. Pode começar uma nova conversa."
- `/relatorio` → linha 441: envia "📊 Gerando conteúdo para Instagram, Email e Blog... Aguarde."

Mas o n8n **também** envia suas próprias mensagens de confirmação ("Memória resetada.", etc). Resultado: mensagens duplicadas no chat.

O dispatcher deveria **apenas orquestrar** — despachar pro n8n e pronto. Quem responde ao usuário é o n8n.

## Solução

Remover as chamadas `sendChatwootMessage` dos handlers `/reset` e `/relatorio` no `admin-dispatcher/index.ts`.

### Arquivo: `supabase/functions/admin-dispatcher/index.ts`

- **Linha 416-418** (`/reset`): Remover o bloco `if (conversationId && brokerageId) { await sendChatwootMessage(...) }`
- **Linha 440-442** (`/relatorio`): Remover o bloco `if (conversationId && brokerageId) { await sendChatwootMessage(...) }`

O n8n continua recebendo o dispatch normalmente e cuida de enviar a resposta pro usuário.

## Resultado

- `/reset` → dispatcher despacha pro n8n → n8n envia "Memória resetada." (1 mensagem só)
- `/relatorio` → dispatcher despacha pro n8n → n8n envia o PDF (sem mensagem extra)

