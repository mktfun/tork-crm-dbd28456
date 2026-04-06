# Proposal: Isolamento Multi-Tenant do Dispatcher

## Status
Em análise (Pendente de Aprovação)

## Requisitos e Contexto

### Problema
O dispatcher atual possui uma falha de isolamento multi-tenant: a detecção de admin procura o remetente (pelo telefone) em todos os produtores e corretoras globalmente através de `ilike('phone', '%...%')`. Isso resulta em:
1. Falsos positivos graves: Um número cadastrado como produtor na Corretora A (via importação ou uso passado) entra em contato com o bot da Corretora B como um lead comum. O sistema verifica o telefone globalmente, identifica que é um "produtor" na Corretora A e responde como se ele fosse um Admin da Corretora B, dando a este usuário externo acesso a apólices, dados sigilosos e o comportamento de "Agente/Mentor" interno em um grupo que ele sequer pertence.
2. Contaminação do prompt interno: O processo administrativo embute logs duvidosos como `[MODO WHATSAPP ATIVADO]` no fluxo da conversa (historizado).

### O que já existe
- Todo o core do projeto (`resolveContext`, `processAdminLogic`, `dispatchToN8n`). O módulo isola um `brokerageId` originário do Chatwoot inbox owner (o CRM User).

### Solução Proposta
1. Refinar e isolar `resolveContext.ts` para checar `producers` associados ESTRITAMENTE à corretora resolvida (`brokerage_id = $brokerageId`). Isso amarra o escopo de modo estrito.
2. Usar match exato ignorando strings alfanuméricas com o helper `normalizePhone(raw)` que retira TUDO (incluindo DDI 55) e foca na paridade absoluta dos últimos 10 ou 11 dígitos, garantindo robustez caso exista algum erro de máscara nas tabelas.
3. Limpar a instrução `[MODO WHATSAPP ATIVADO]` de `processAdminLogic.ts`, jogando qualquer instrução especial de formatação para os System Prompts nativos, no `buildPrompt.ts`.

### Critérios de Aceite
- [ ] Um Produtor/Administrador de uma corretora com banco UUID `X` atuando como cliente normal da Corretora UUID `Y` NÃO É promovido a admin, interagindo com a triagem padrão de Lead da Corretora Y.
- [ ] Um Admin real da Corretora Y é corretamente reconhecido unicamente no contexto da sua caixa de entrada, e acessa tranquilamente as tools.
- [ ] A AI não interage passivamente ou ativamente afirmando "Modo Whatsapp ativado" com nenhum dos usuários.
