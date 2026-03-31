

# Plano: Dispatcher não deve alterar mensagens

## Problema

No `/relatorio` (linha 434), o dispatcher sobrescreve `body.content` com `'[RELATÓRIO] Geração de conteúdo para Instagram, Email e Blog'` antes de enviar ao n8n. O dispatcher deveria apenas orquestrar — nunca alterar o conteúdo da mensagem original.

## Solução

No handler do `/relatorio`, manter `body` intacto ao despachar para o n8n. O system prompt já contém a `<task>` com as instruções de geração de conteúdo — não precisa alterar o `content`.

### Arquivo: `supabase/functions/admin-dispatcher/index.ts`

**Linha 434**: Trocar `body: { ...body, content: '[RELATÓRIO] Geração de conteúdo para Instagram, Email e Blog' }` por simplesmente `body` (sem spread/override).

**Linha 437**: Trocar `content: '/relatorio'` por `content` (variável original, que já é `/relatorio`).

Resultado: o n8n recebe a mensagem original sem modificação. O comportamento do relatório continua funcionando porque as instruções estão no `systemPrompt`, não no `content`.

