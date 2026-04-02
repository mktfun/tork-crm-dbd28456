# Design 028 — WhatsApp Native Formatter

## Arquitetura

```
chatwoot-dispatcher/
  modules/
    processAdminLogic.ts   ← importa formatForWhatsApp, remove regexes inline

_shared/
  whatsapp-formatter.ts    ← NOVO módulo centralizado
  chatwoot.ts              ← existente, sem mudança
```

## Fluxo de dados

```
Mensagem WhatsApp do Corretor
        │
        ▼
chatwoot-dispatcher
        │
        ▼
processAdminLogic.ts
        │  injeta instrução [MODO WHATSAPP] na mensagem
        ▼
ai-assistant (gera resposta em markdown)
        │
        ▼
formatForWhatsApp(answer)   ← _shared/whatsapp-formatter.ts
        │  pipeline de 12 transformações determinísticas
        ▼
sendChatwootMessage()       ← texto limpo e bonito
        │
        ▼
WhatsApp do Corretor ✅
```

## Dependências

- `processAdminLogic.ts` depende de `_shared/whatsapp-formatter.ts` (nova)
- `_shared/whatsapp-formatter.ts` não depende de nada externo (pure TS)

## Mapa de conversões

| Input (Markdown) | Output (WhatsApp) |
|--|--|
| `### Título` | `*Título*\n` |
| `**negrito**` | `*negrito*` |
| `_itálico_` | `_itálico_` |
| `- item` / `* item` | `• item` |
| `1. item` | `1. item` (mantido limpo) |
| `[ ]` / `[x]` | `☐` / `✅` |
| `> blockquote` | `_texto_` (sem >) |
| `| Col | Val |` | `• Coluna: Valor` por linha |
| ` ```code``` ` | removido ou exibido simples |
| `---` | linha vazia |
| `<thinking>...</thinking>` | removido |
