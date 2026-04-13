# PROPOSAL: SDR Deal Routing Fix — Triagem → Funil Correto (Spec 032)

## 1. Diagnóstico Completo

### Bug Principal: Modo /teste quebra o `resolveDeal` inteiramente

No `index.ts`, ao entrar no modo `/teste`, o código faz:
```ts
senderRole = null // zeramos senderRole para o admin virar "cliente"
```

Mas ao chamar `resolveDeal`, o parâmetro `role` passado é **`crmUserRole`** (papel do usuário no CRM — que continua sendo `'admin'` para o dono da corretora):

```ts
await resolveDeal(supabase, resolvedAI, userId, clientId, ..., crmUserRole || 'user', ...)
//                                                              ^^^^^^^^^^^ PROBLEMA: sempre 'admin'
```

Em `resolveDeal.ts`, linha 326:
```ts
if (role !== 'admin') {
  // tudo que cria/busca deals está aqui dentro
```

**Consequência**: Em modo `/teste`, `role === 'admin'` → o bloco inteiro é pulado → `currentDeal = null` sempre → bot entra em triagem genérica → `autoCreateDeal` nunca é chamado → o produto identificado ("seguro residencial") **nunca vira negociação** → o objetivo da etapa nunca executa.

### Bug Secundário: Stage objective não executa na mesma mensagem que cria o deal

Quando o `autoCreateDeal` é bem-sucedido, o `stageAiSettings` é carregado **na mesma mensagem**. Isso é correto — o prompt já inclui o objetivo. Porém há uma janela cega:

- **Msg 1**: cliente diz "boa tarde" → `classifyLeadWithAI` retorna null (sem produto especificado) → sem deal → bot faz triagem → pede o produto
- **Msg 2**: cliente diz "quero seguro residencial" → classificação funciona → deal criado → objetivo da etapa entra no prompt (link de cotação) → **MAS a resposta desta mensagem já foi a pergunta antecipada da triagem**, então a IA pode responder de forma desconexa

### Bug Terciário: Primeira resposta do cliente com produto já especificado na msg 1

Se o cliente na msg 1 já diz "boa tarde, quero cotar seguro residencial", a classificação DO funil roda com apenas essa mensagem. Isso funciona (porque o produto está claro). Mas a IA pode ainda assim responder às duas coisas (cumprimentar + pedir localização) ao invés de confirmar o produto e enviar o link do objetivo.

### Brecha Adicional: Nenhuma confirmação visual ao cliente que um deal foi criado

Quando `autoCreatedDeal = true`, o cliente não recebe nenhum sinal de que está sendo encaminhado para um funil. Isso cria uma sensação de que o bot "só perguntou e sumiu com a informação".

---

## 2. O que JÁ EXISTE (reutilizar)

- `resolveDeal.ts`: já tem `autoCreateDeal` e `classifyLeadWithAI` funcionando
- `buildPrompt.ts`: já injeta `stageAiSettings` quando tem deal
- `index.ts`: já tem test mode com `senderRole = null`
- `crm_ai_settings`: já tem `ai_objective`, `ai_custom_rules` por etapa

## 3. O que precisa ser CRIADO/CORRIGIDO

### Fix 1 (Crítico): Passar `senderRole` para `resolveDeal` em vez de `crmUserRole`

Em `index.ts`, a chamada de `resolveDeal` deve usar o `senderRole` pós-override (que em modo teste é `null`), não o `crmUserRole` do banco:

```ts
// ANTES
resolveDeal(..., crmUserRole || 'user', ...)

// DEPOIS
resolveDeal(..., senderRole || 'client', ...)
// 'client' como fallback para que o bloco de deals SEMPRE execute para não-admins
```

E em `resolveDeal.ts`, o check deve ser:
```ts
if (role !== 'admin') { → if (role === 'admin') return { ...defaults }
```
Ou melhor: remover o guard `role !== 'admin'` completamente e usar só `senderRole`.

### Fix 2 (Importante): Timeout de Triagem — promover deal na mesma rodada

Quando a triagem identifica um produto, o agentLoop **da mesma mensagem** já tem o `stageAiSettings` do deal recém-criado. O prompt deve deixar claro quando há `autoCreatedDeal = true` que o bot deve executar o objetivo imediatamente (ex: enviar link) sem pedir mais dados desnecessários.

Adicionar em `buildPrompt.ts` quando `autoCreatedDeal` for `true`:
```
IMPORTANTE: Um novo atendimento foi aberto neste momento para [produto]. Execute imediatamente o objetivo desta etapa sem fazer novas perguntas de qualificação.
```

### Fix 3 (Cosmético/UX): Mensagem de transição ao criar deal automaticamente

Após `autoCreateDeal` com sucesso, injetar no `clientContextForPrompt` uma instrução para o bot mencionar naturalmente que vai encaminhar/cuidar do produto identificado.

---

## 4. Critérios de Aceite

- [ ] Em `/teste`, o admin recebe o mesmo fluxo de deals que um cliente real
- [ ] Quando o cliente menciona "seguro residencial" (produto identificável), na mesma resposta o bot já envia o link de cotação (objetivo da etapa)
- [ ] Quando o cliente só saúda sem especificar produto, triagem continua normalmente
- [ ] O `/teste` mostra diferença visual clara entre resposta de triagem vs resposta com objetivo de etapa

---

## 5. Outras Brechas Mapeadas (para specs futuras)

| Brecha | Impacto | Spec futura |
|--------|---------|-------------|
| `classifyLeadWithAI` usa apenas a última mensagem na 1ª rodada (sem histórico) | Bot pode não classificar na msg 1 se cliente for vago | 033 |
| Sem confirmação ao cliente quando deal é criado (brecha UX) | Cliente não sabe que está sendo "encaminhado" | 033 |
| `resolveDeal` busca deal mais recente por `client_id` — se cliente tiver 2 deals abertos, pega o errado | Deal errado pode ser associado | 034 |
| Stage objectives são strings soltas — sem mecanismo de "confirmed sent" para o link | Bot pode enviar link 2x se cliente mandar 2 msgs antes de responder | 034 |
