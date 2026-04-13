# Master Spec: 043 SDR Security, Routing & Human Escalation

## 1. Visão Geral
Esta especificação foca em resolver o vazamento de lógica entre o Assistente Amorim (Mentor) e o motor SDR, garantindo uma separação total e segura. Implementaremos um Dispatcher inteligente que valida a identidade do remetente (Produtor vs Cliente) e criaremos a ferramenta de escalonamento para humanos dentro do SDR Builder, removendo configurações legadas e centralizando a inteligência no fluxo.

## 2. Requisitos de Segurança e Separação
- **R1: Isolamento de Personalidade:** O motor SDR deve operar exclusivamente sobre o grafo do ReactFlow. Sob nenhuma circunstância (incluindo falha de fluxo ou simulação) ele deve cair no prompt do "Amorim AI" (Mentor Técnico).
- **R2: Restrição de Acesso ao Assistente:** O Assistente Amorim (com acesso a todas as tools de CRM) deve ser bloqueado para contatos externos. Ele só responderá se:
    1. A requisição vier de dentro da UI do CRM (Dashboard/Pages).
    2. A requisição vier do WhatsApp através do número de telefone de um **Produtor** cadastrado na corretora.
- **R3: Silêncio Padrão:** Se uma mensagem de cliente não disparar nenhum gatilho (Trigger) de workflow SDR ativo, a IA **não deve responder nada**, mantendo a integridade da conversa humana.

## 3. Novas Funcionalidades SDR
- **R4: Tool "Escalar para Humano":** Novo nó no Builder que permite:
    - Definir mensagem de aviso ao cliente (ex: "Aguarde, um consultor vai te atender").
    - Definir mensagem interna para o humano (ex: "Lead [Nome] solicitou ajuda humana no fluxo [Nome]").
    - Definir o número de destino e o **tempo de pausa (cooldown)** da IA naquela conversa.
- **R5: Limpeza de UI:** Remover a configuração de "Telefone de Alerta" da aba Avançado, pois agora o número é definido diretamente no nó de escalonamento.

## 4. User Stories
- **US1:** Como Corretor, quero que meus clientes recebam apenas as mensagens do fluxo que eu desenhei, e nunca vejam os pensamentos técnicos da IA (<thinking>).
- **US2:** Como Administrador, quero garantir que se um estranho mandar mensagem e eu não tiver um fluxo ativo para ele, a IA ignore a mensagem.
- **US3:** Como Estrategista, quero arrastar um nó de "Escalar para Humano" após uma objeção de preço e definir que o consultor Rodrigo receba o alerta com o link da conversa.

## 5. Plano de Execução
1. **Dispatcher Security:** Atualizar `supabase/functions/ai-assistant/index.ts` para validar o remetente antes de processar qualquer IA.
2. **SDR Engine Hardening:** Refatorar `engine-sdr.ts` para garantir que o retorno seja estritamente baseado no fluxo, removendo fallbacks para a lógica de Mentor.
3. **Escalation Node:**
    - Criar `EscalationNode.tsx` no Builder.
    - Adicionar propriedades de Mensagem, Telefone e Cooldown.
4. **UI Cleanup:** Remover campo legacy de `AutomationConfigTab.tsx`.
