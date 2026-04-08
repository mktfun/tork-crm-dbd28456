# Checklist de Tarefas: 038 Layout & SDR Expansion

## Fase 1: Correção do Layout Principal
- [ ] Editar `src/pages/AIAutomation.tsx` e `src/components/automation/AIAutomationDashboard.tsx` para remover fundos redundantes (`bg-background/50`).
- [ ] Configurar flexbox rígido (`flex-1`, `h-full`, `min-h-0`) em `AIAutomationDashboard.tsx` para evitar que a tela encolha ao clicar na aba "Avançado".
- [ ] Certificar que `TabsContent` tenha `h-full overflow-y-auto` nas abas de formulários e `overflow-hidden` na aba do SDR Builder.
- [ ] Remover margens (`m-0`, `p-4` redundantes) para que o "Liquid Glass" pareça flutuar diretamente no Canvas do CRM.

## Fase 2: Modo Escuro no ReactFlow e SDR Builder
- [ ] Atualizar `className` dos `AVAILABLE_TOOLS` em `src/components/automation/builder/SDRBuilder.tsx` para garantir o uso de `dark:bg-*` e forçar o texto com contraste legível.
- [ ] Atualizar `className` de `initialNodes` para a mesma regra (texto não ficar branco sobre fundo branco/claro no modo escuro).
- [ ] Ajustar o fundo do `ReactFlow` para garantir que o Grid/Dots apareçam de forma agradável em ambos os temas.

## Fase 3: Expansão de Novas Tools (Decisões da IA)
- [ ] Adicionar os 5 novos tipos ao array `AVAILABLE_TOOLS`: Mover Negociação, Marcar Ganho/Perda, Enviar Texto, Instrução Livre, Decisão.
- [ ] Criar a lógica dinâmica na Right Sidebar (Painel de Propriedades) do `SDRBuilder.tsx` para renderizar formulários específicos baseados no prefixo da tool:
    - Se for `tool_`: Mostrar o "Status Ativo" (Checkbox).
    - Se for `action_move_deal`: Mostrar select simulado para "Destino (Próxima Etapa)".
    - Se for `action_close_deal`: Mostrar toggle "Ganho vs Perda".
    - Se for `action_send_text`: Mostrar TextArea "Mensagem Fixa".
    - Se for `action_custom_prompt`: Mostrar TextArea "Comando Limpo" (Ex: "Quando o usuário perguntar o preço, você...").
    - Se for `decision_condition`: Mostrar Input para a Condição ("Se...") e indicar visualmente no canvas.

## Fase 4: Validação
- [ ] Fazer testes alternando rapidamente entre abas para verificar a estabilidade vertical da janela.
- [ ] Alternar entre modo Claro e Escuro para verificar o contraste dos blocos.
- [ ] Arrastar os 5 novos blocos para o Canvas e testar seus painéis de edição laterais correspondentes.
- [ ] Comitar as mudanças (`feat(automation): fix nested layout and expand SDR builder nodes`).
