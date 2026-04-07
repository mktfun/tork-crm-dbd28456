# TASKS: SDR Deal Routing Fix (Spec 032)

## Fase 1: Ajuste no Test Mode (`index.ts`)
- [x] Mudar o envio do par de `resolveDeal`: O argumento de *Role* não deve ser o `crmUserRole || 'user'`, mas o `senderRole || 'client'`, de modo a garantir o respeito pela quebra de hierarquia em sessões temporárias de teste (`senderRole = null`).
- [x] Passar o boolean `autoCreatedDeal`, o `autoCreatedProductId` e o `autoCreatedProductName` extraídos do `resolveDeal(...)` em diante como variável para os parâmetros do LLM e consequentemente para a formatação do prompt (dentro de `buildPrompt.ts`).

## Fase 2: Simplificação Local do Resolver (`resolveDeal.ts`)
- [x] Excluir e/ou refatorar a checagem interna de `if (role !== 'admin')`. Com a injeção do `senderRole`, o parâmetro de entrada se tornará `client` caso devidamente setado para transbordo ou por sessão simulada, então as avaliações ocorrerão adequadamente em todas as aberturas do CRM do lojista.

## Fase 3: Racionalização Pós-AutoCreate (`buildPrompt.ts`)
- [x] Adicionar os parâmetros `autoCreatedDeal: boolean` e `autoCreatedProductName: string | null` na função `buildPrompt(...)`.
- [x] Ao montar o prompt (`systemPrompt`), criar um condicional verificando se `autoCreatedDeal === true`.
   - [x] Se for, acoplar orientações de extrema prioridade ao Agente SDR para que não insista em qualificações e assuma a etapa criada com o envio de meta objetivo do funil de forma imediata (ex. "Atendimento e escopo ativado de forma limpa pelo robô no Produto X. Vá direto ao ponto solicitando dados, agendando contato ou mandando o link estipulado.").

## Fase 4: Avaliação / Validação
- [ ] **[VOCÊ]** Rodar o deploy da Edge Function `npx supabase functions deploy chatwoot-dispatcher`.
- [ ] **[VOCÊ]** Testar no webchat do Tork `/teste`. Ao solicitar uma cotação "seguro auto" na primeira resposta ao Assistente, checar se a qualificação de autoCreate roda, e se a mesma resposta empurra o Link gerado como finalidade de Estágio do Funil.
