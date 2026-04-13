# Spec 028 — WhatsApp Native Formatter

## Problema

O `ai-assistant` gera respostas ricas em **Markdown padrão** (tabelas, `###`, `**negrito**`, `-` listas).
No **WhatsApp**, esse Markdown não renderiza: aparecem asteriscos soltos, pipes de tabela e hashtags crus, tornando a leitura horrível.

A solução atual (`processAdminLogic.ts`) tem um conjunto de regexes simples que não cobre todos os casos e obriga o filtro a "adivinhar" o que fazer — resultando em `•  *1. Titulo*` e outros artefatos.

## Meta

Criar um módulo dedicado `_shared/whatsapp-formatter.ts` com lógica **determinística e abrangente** de tradução Markdown → WhatsApp, e integrá-lo ao `processAdminLogic.ts`. Adicionalmente, refinar as instruções do system prompt injetadas para guiar o LLM a gerar texto já "pre-formatado" de forma amigável para o filtro.

---

## O que JÁ EXISTE e será REUTILIZADO

| Arquivo | Papel |
|---------|-------|
| `_shared/chatwoot.ts` | Envia mensagem final ao Chatwoot |
| `chatwoot-dispatcher/modules/processAdminLogic.ts` | Orquestra a chiamada ao ai-assistant e aplica filtros inline |
| `ai-assistant/index.ts` (system prompt) | Define padrões de resposta (tabelas, ###, **negrito**) — será mantido para desktop |

---

## O que será CRIADO

### `_shared/whatsapp-formatter.ts` (NOVO)

Responsável por **toda** a lógica de conversão. Exporta uma única função:

```ts
export function formatForWhatsApp(rawText: string): string
```

Pipeline de transformações (em ordem):

1. **Strip `<thinking>`** — remove bloco de raciocínio interno
2. **Strip Markdown fences** — remove ` ```code``` ` e ` ```language ```
3. **Títulos** `##` / `###` → `*TÍTULO*` + quebra de linha extra
4. **Negrito Markdown** `**texto**` → `*texto*` (WhatsApp bold)
5. **Itálico Markdown** `_texto_` / `*texto*` (itálico) → `_texto_` (WhatsApp italic) — apenas quando < 50 chars
6. **Tabelas** → converter para lista estruturada com cabeçalho em negrito e linhas como `• Campo: Valor`
7. **Listas não-ordenadas** `- item`, `* item` → `• item`  
8. **Listas ordenadas** `1. item` → `1️⃣ item` (ou manter `1.` puro — avaliar)
9. **Checkboxes** `[ ]` → `☐` e `[x]` → `✅`
10. **Blockquote** `> texto` → sem prefixo, negrito no texto
11. **Separadores** `---` → linha vazia dupla
12. **Espaçamento** — garantir exatamente 1 linha em branco entre seções, sem espaços desnecessários

### Instrução de sistema WhatsApp (injetada inline)

Substituir a instrução atual por um texto mais preciso e coercivo:

```
[MODO WHATSAPP] 
Você está respondendo via WhatsApp. As seguintes regras são ABSOLUTAS:
✅ Use *negrito* (asterisco simples) para títulos e destaques.
✅ Use _itálico_ (underscore simples) para ênfases leves.
✅ Use • (•) como marcador de lista – NUNCA traço ou asterisco.
✅ Use uma linha em branco entre blocos/seções.
⛔ NUNCA use tabelas (| Coluna |). Converta em listas "• Campo: Valor".
⛔ NUNCA use ### ## ou # para títulos.
⛔ NUNCA use ** para negrito. Use * (simples).
⛔ NUNCA use ``` code blocks ```.
A resposta deve ser legível e bonita diretamente no celular.
```

---

## Critérios de Aceite

- [ ] Nenhum `|`, `##`, `###`, `**`, ` ``` ` ou `<thinking>` chega ao usuário no WhatsApp
- [ ] Listas aparecem com `•` limpo
- [ ] Títulos aparecem em *Negrito* com espaço extra acima
- [ ] Tabelas são convertidas para listas `• Campo: Valor`
- [ ] Checkboxes viram emojis (`☐` / `✅`)
- [ ] Mensagens do sistema (`/help`, `/analise`, `/reset`) já são pré-formatadas e não passam pelo filtro
- [ ] O filtro NÃO afeta o output do ai-assistant para o painel desktop (escopo isolado)

---

## User Stories

**Como corretor usando o bot no WhatsApp**, quero receber respostas limpas e bonitas, sem símbolos estranhos, para que eu consiga ler as informações rapidamente no celular.

**Como desenvolvedor**, quero um único módulo de formato em `_shared/` para que qualquer Edge Function futura que precise enviar mensagens WhatsApp possa reutilizá-lo.
