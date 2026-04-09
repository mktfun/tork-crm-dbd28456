# Checklist de Tarefas: 043 SDR Security & Escalation

## Fase 1: Hardening do Dispatcher (Backend)
- [ ] Editar `supabase/functions/ai-assistant/index.ts`.
- [ ] Implementar a verificação de `is_internal` (buscar se o `sender_phone` ou `userId` pertence a um `profiles` ou `producers`).
- [ ] Modificar o fluxo de decisão: Se for simulação ou se for um contato externo, rodar **APENAS** o SDR Engine.
- [ ] Garantir que o retorno do assistente genérico Amorim AI seja disparado **EXCLUSIVAMENTE** para usuários internos.
- [ ] Adicionar retorno `204` ou mensagem de "silêncio" caso nenhum gatilho SDR capture a mensagem do cliente.

## Fase 2: Engine de Escalonamento (Backend)
- [ ] Editar `supabase/functions/ai-assistant/engine-sdr.ts`.
- [ ] Adicionar o handler para o tipo de nó `escalation`.
- [ ] Implementar a lógica de envio de mensagens duplas (cliente e humano) no nó de escalonamento.
- [ ] Implementar a gravação do timestamp de pausa da IA nos metadados/config da corretora.

## Fase 3: SDR Builder - Nó de Escalonamento (Frontend)
- [ ] Editar `src/components/automation/builder/nodes/CustomNodes.tsx`.
- [ ] Adicionar o componente `EscalationNode` (ícone de fone de ouvido, cor vermelha vibrante).
- [ ] Registrar o novo tipo em `customNodeTypes`.
- [ ] Editar `src/components/automation/builder/SDRBuilder.tsx`.
- [ ] Adicionar `action_escalate` ao array `AVAILABLE_TOOLS`.
- [ ] Implementar o formulário de propriedades para o nó de escalonamento (Inputs para mensagem do cliente, alerta interno, telefone do humano e seletor de tempo de pausa).

## Fase 4: Limpeza e Polimento
- [ ] Editar `src/components/automation/AutomationConfigTab.tsx`.
- [ ] Remover o Card "Alertas do SDR" (Card 0.6) que continha o telefone legado.
- [ ] Executar teste de simulação para garantir que a IA não escape mais para o modo "Mentor".
- [ ] Comitar todas as alterações sob `feat(automation): strict ai separation and human escalation tool`.
