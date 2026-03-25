

# Plano: Comando `/help` no Admin Dispatcher

## Resumo

Adicionar o comando `/help` no `admin-dispatcher` que responde via Chatwoot com a lista de todos os comandos disponíveis, incluindo os que existem fora do dispatcher (`/reset`, `/relatorio`).

## Mudanças

### 1. `supabase/functions/admin-dispatcher/index.ts`

Adicionar um bloco antes do check de `/analise` (antes da linha 369) que intercepta `/help`:

```typescript
if (contentLower === '/help') {
  if (conversationId && brokerageId) {
    await sendChatwootMessage(brokerageId, conversationId,
      `🤖 *Comandos disponíveis:*\n\n` +
      `📥 /analise — Inicia modo de análise batch. Envie múltiplos docs, áudios e mensagens. Tudo será acumulado.\n\n` +
      `▶️ /start — Processa todos os itens acumulados no modo análise.\n\n` +
      `🔄 /reset — Limpa o histórico de conversa com o assistente.\n\n` +
      `📊 /relatorio — Gera conteúdo para Instagram, Email e Blog com base nos dados da corretora.\n\n` +
      `💬 Qualquer outra mensagem será respondida normalmente pelo assistente.`
    )
  }
  return new Response(JSON.stringify({ success: true, mode: 'help' }), { headers: { 'Content-Type': 'application/json' } })
}
```

### 2. `/reset` — Limpar histórico de conversa

Adicionar handler para `/reset` que limpa o histórico da conversa no Chatwoot (ou no contexto que o n8n mantém). Responde com confirmação.

### 3. `/relatorio` — Gerar conteúdo para redes sociais

Adicionar handler para `/relatorio` que despacha para o n8n com um system prompt específico pedindo geração de conteúdo para Instagram, Email marketing e Blog, usando dados do CRM e base de conhecimento.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `supabase/functions/admin-dispatcher/index.ts` | Adicionar handlers para `/help`, `/reset` e `/relatorio` |

