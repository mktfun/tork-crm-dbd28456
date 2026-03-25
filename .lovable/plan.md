

# Plano: Corrigir Avaliação Prematura de Objetivo

## O que aconteceu

1. Davi envia "preciso de um seguro fiança"
2. Dispatcher cria deal automaticamente no "Novo Lead" (autoCreatedDeal=true)
3. Chatwoot dispara **dois webhooks** para a mesma mensagem (comum no Chatwoot)
4. O **segundo webhook** encontra o deal já existente → `autoCreatedDeal=false`
5. O objetivo do "Novo Lead" é: *"ao identificar o produto e intenção, mande o link..."*
6. O avaliador vê "seguro fiança" no histórico → responde "SIM"
7. Deal salta de "Novo Lead" → "Em Contato" **antes do bot responder**

## Causa raiz

O guard `!autoCreatedDeal` no `index.ts` não protege contra o segundo webhook. No primeiro webhook o deal é criado (skip OK). No segundo, o deal já existe no banco, então `autoCreatedDeal=false` e a avaliação roda.

Além disso, o objetivo cadastrado mistura **instrução** ("mande o link") com **critério de conclusão**, o que faz o avaliador interpretar "produto identificado = objetivo cumprido" antes do bot sequer agir.

## Correções

### 1. `evaluateStageCompletion.ts` — Exigir mínimo de interações do bot

Antes de avaliar, contar quantas mensagens do **agente** existem no histórico recente. Se o bot ainda não respondeu naquela etapa, pular a avaliação.

```typescript
// Após buscar recentMessages, contar respostas do agente
const agentMessages = msgs.filter((m: any) => m.message_type === 1)
if (agentMessages.length < 1) {
  console.log('⏳ Skipping objective eval: bot has not responded yet in this stage')
  return result
}
```

### 2. `evaluateStageCompletion.ts` — Proteger deals recém-criados

Adicionar check de idade do deal. Se criado há menos de 60 segundos, pular avaliação:

```typescript
const dealAge = Date.now() - new Date(params.deal.created_at).getTime()
if (dealAge < 60_000) {
  console.log('⏳ Skipping objective eval: deal created less than 60s ago')
  return result
}
```

### 3. Melhorar o prompt do avaliador

O prompt atual é muito genérico. Precisa instruir o avaliador a considerar se o **agente já executou** a ação do objetivo, não apenas se o cliente expressou a necessidade:

```typescript
content: `Dado o objetivo da etapa: "${objective}"

Histórico recente:
${recentMessages}

O objetivo foi COMPLETAMENTE atingido pelo AGENTE (não apenas pelo cliente ter expressado interesse)?
Responda "SIM" apenas se o agente já executou a ação descrita no objetivo (ex: enviou link, coletou dados, etc).
Se o agente ainda não respondeu ou não executou a ação, responda "NAO".`
```

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `evaluateStageCompletion.ts` | Guard de idade do deal + contagem de respostas do agente + prompt melhorado |

## Resultado esperado

- Deal criado no "Novo Lead" e **permanece lá** até o bot responder e enviar o link
- Avaliação só roda após pelo menos 1 resposta do agente na etapa
- Deals recém-criados (<60s) ficam protegidos contra avaliação prematura

