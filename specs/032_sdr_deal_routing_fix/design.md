# DESIGN: SDR Deal Routing Fix (Spec 032)

## 1. Contexto

A regressão reportada pelo usuário de que "o cliente pede residencial e o bot continua perguntando qual o produto sem mandar o link (objetivo da etapa)" provém de três focos de erro que afetam o SDR:

- **Foco 1 (Bug de Escopo no Test Mode):** A função `resolveDeal` é protegida com `if (role !== 'admin')`. Durante o modo de simulação `/teste`, o administrador ganha o comportamento de cliente pela redefinição local `senderRole = null`. Mas ao chamar o `resolveDeal()`, a Edge Function mandava a variável do banco de dados `crmUserRole`, que invariavelmente é `'admin'`. Logo, a parte de classificar produto ou lidar com *deals* morria silenciosamente, prendendo o bot para sempre na Triagem.
- **Foco 2 (Gap de Contexto Pós-Classificação):** Se o cliente passa as informações todas na mesma tacada (ex: *"quero seguro residencial com quebra de vidros"*), o backend do Tork identifica, chama o Modelador SQL oculto (`autoCreateDeal`), comita o *Deal* no banco... e o LLM ganha os `stageAiSettings` (que contém os envios de link). Porém, ao ser em tempo de execução única, a triagem não ganha contexto de salto. O LLM muitas vezes acha que responde sob triagem.

---

## 2. Padrões Acordados

Nenhuma alteração de frontend (Stitch MCP) é necessária, nem alteração de modelagem do Banco de Dados. Todo o patch vive logicamente dentro da Edge Function Node/Deno (`chatwoot-dispatcher`).

### Módulo `index.ts`
Substituir o envio indevido do Perfil Hierárquico no `resolveDeal`:
Deve-se passar `senderRole || 'client'` ao invés de `crmUserRole || 'user'`. Assim, a função `resolveDeal` aceitará correr pelos blocos, sabendo que a flag temporária de cliente foi validada no escopo.

### Módulo `resolveDeal.ts`
Fazer o refactoring de: `if (role !== 'admin')` para `if (role !== 'admin' || isTestSession)`... ou simplificar aceitando apenas a checagem no `index` superior e cortando a restrição no escopo local do módulo, visto que `resolveDeal` deve ocorrer pra qualquer mensagem onde o cliente fale com o bot (que logicamente já foi retido pra cima, e só chega se for `senderRole = null` ou `'client'`). 
A assinatura vai refletir `senderRole` do contexto principal.

### Módulo `buildPrompt.ts`
Passar o boolean `autoCreatedDeal` para a montagem de Prompt do LLM:
Se `autoCreatedDeal === true`: adicionar dinamicamente à base do System Prompt instruções que sinalizem a descoberta. Ex:
`[SISTEMA]: Você acabou de criar e categorizar um Atendimento e Etapa para este cliente no produto X. Pule confirmações, leia o Objetivo desta aba e cumpra EXATAMENTE O QUE LÁ ESTÁ. Vá direto ao ponto.`
