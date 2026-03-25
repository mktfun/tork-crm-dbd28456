
## Observação principal

A exclusão dos clientes não causou o problema. Ela só trocou o `clientId` antigo pelo novo.

Antes da exclusão:
- `clientId=9ddf2cb8-...`
- `sender.type=undefined`
- `hasDeal: false`

Depois da exclusão:
- `clientId=4b3a71fe-...`
- `sender.type=undefined`
- `hasDeal: false`

Ou seja: o cadastro/recadastro está funcionando. O bloqueio continua exatamente no mesmo ponto.

## Causa raiz provável

O dispatcher depende desta condição em `resolveDeal.ts`:

```ts
if (!currentDeal && sender?.type === 'contact' && clientId) {
```

Mas nos webhooks reais que você mostrou, o payload está chegando com:

```ts
sender.type = undefined
```

Então o sistema:
1. resolve ou cria o cliente
2. não encontra negócio aberto
3. não tenta `autoCreateDeal`
4. envia pro n8n com `hasDeal: false`
5. o bot responde em modo genérico/triagem
6. por isso ele parece “inconsistente” e “não roteia para a etapa”

## O que os logs provam

Os logs já fecham o diagnóstico:

```text
⚠️ Skipped autoCreateDeal: sender.type=undefined, clientId=...
🚀 Forwarding to n8n... { role: "corretor", messageType: "text", hasDeal: false }
```

Isso significa que o problema não é:
- classificação de produto
- criação de cliente
- n8n fora do ar
- reset de memória
- exclusão dos registros

O problema é que a criação automática do deal está sendo bloqueada antes mesmo de tentar classificar.

## Plano de correção

### 1. Remover a dependência de `sender.type` para criar deal
Como o `index.ts` já filtra:
- `body.event === 'message_created'`
- `body.message_type === 'incoming'`

essa validação já garante que a mensagem é de entrada. Então `resolveDeal` não deveria depender de `sender?.type === 'contact'` para tentar criar deal.

### 2. Trocar a regra por uma condição estável
Usar uma das abordagens abaixo:
- abordagem preferida: passar um boolean explícito do `index.ts` para `resolveDeal`, algo como `isIncomingMessage`
- alternativa: usar `body.message_type === 'incoming'` antes, e não `sender.type`

Assim o auto-create passa a depender de algo que realmente existe no webhook real.

### 3. Ajustar também o cancelamento de follow-up
Hoje isso também depende de `sender?.type === 'contact'`:
```ts
if (sender?.type === 'contact') {
  clientJustResponded = true
  ...
}
```

Esse trecho deve usar o mesmo critério estável da entrada real, senão follow-up e comportamento de retorno continuam inconsistentes.

### 4. Adicionar logs do shape real do webhook
Adicionar logs defensivos curtos para mostrar:
- `body.message_type`
- `body.event`
- presença de `sender.type`
- `conversation.id`
- `clientId`
- se entrou ou não no fluxo de auto-create

Isso evita novo diagnóstico “no escuro”.

### 5. Revalidar o fluxo completo
Depois da correção, repetir este cenário real:
```text
/reset
preciso de um seguro fiança
5000
```

Validações esperadas:
- cliente resolvido ou criado
- `autoCreateDeal` executado
- deal criado ou reutilizado
- `hasDeal: true` no payload enviado ao n8n
- `stage_id` e `pipeline_id` preenchidos
- resposta do bot mais consistente e orientada à etapa correta

## Resultado esperado após a correção

Em vez de:
```text
Skipped autoCreateDeal
hasDeal: false
```

o esperado passa a ser:
```text
Attempting AI classification for auto-create...
Auto-created deal ...
hasDeal: true
```

A partir daí o n8n recebe contexto de deal/etapa e o bot deixa de responder como se todo contato fosse “genérico”.

## Detalhe técnico

O bug é de contrato de payload, não de IA.

O código assumiu que o webhook sempre teria:
```ts
sender.type === 'contact'
```

Mas, no tráfego real que você trouxe, esse campo não está vindo. Como a regra de negócio depende dele, o roteamento inteiro fica travado antes da classificação.

## Escopo da implementação

Arquivos a revisar:
- `supabase/functions/chatwoot-dispatcher/index.ts`
- `supabase/functions/chatwoot-dispatcher/modules/resolveDeal.ts`

Mudanças previstas:
- parar de usar `sender.type` como trava de criação de deal
- usar o evento real de entrada já validado no dispatcher
- alinhar o cancelamento de follow-ups ao mesmo critério
- reforçar logs de diagnóstico do webhook real
