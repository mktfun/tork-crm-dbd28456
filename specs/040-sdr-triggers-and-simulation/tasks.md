# Checklist de Tarefas: 040 Triggers & Simulação

## Fase 1: Correção do Arrastar-e-Soltar (D&D)
- [ ] Modificar a função `onDrop` dentro de `src/components/automation/builder/SDRBuilder.tsx`.
- [ ] Alterar o argumento de `reactFlowInstance.screenToFlowPosition` para usar os valores puros de `event.clientX` e `event.clientY`, dispensando a subtração do bounding box do container na v12.

## Fase 2: Configuração de Múltiplos Fluxos (State)
- [ ] Criar a interface `Workflow` em `SDRBuilder.tsx`.
- [ ] Inicializar o estado com um array de 2 fluxos iniciais e um estado para o "Fluxo Ativo" (`activeWorkflowId`).
- [ ] Fazer as listas da "Aba de Fluxos" na Sidebar Esquerda renderizarem de forma dinâmica.
- [ ] Configurar o onClick de cada card de fluxo para atualizar `setNodes` e `setEdges` de acordo com os dados do fluxo.
- [ ] Ligar o botão `Ativo/Inativo` no TopBar e o Título editável às propriedades `isActive` e `name` do fluxo selecionado.
- [ ] Criar a função para "Novo Fluxo" na sidebar, criando um item limpo no array contendo apenas um Nó Trigger.

## Fase 3: Configuração dos Gatilhos do Nó Inicial (Trigger)
- [ ] Na lógica do Right Sidebar (Propriedades), tratar a condição `selectedNode.type === 'trigger'`.
- [ ] Adicionar os campos: Público (Todos, Só Clientes, Só Desconhecidos).
- [ ] Adicionar os campos: Regra de Pipeline (Qualquer, Fora de Funil, Funil Específico).
- [ ] Criar o update bidirecional com a função genérica `updateNodeData`.
- [ ] Fazer o nó refletir esse subtítulo ("Para todos os Clientes" no Canvas). Para isso, atualizar `TriggerNode` em `CustomNodes.tsx` para exibir um resumo das configs.

## Fase 4: Construção do SDR Simulator
- [ ] Criar o arquivo `src/components/automation/builder/SDRSimulator.tsx`.
- [ ] Criar um "Drawer Flutuante" (janela de mock de celular), posicionado absolutamente sobreposto no Builder.
- [ ] Implementar estado local de mensagens (Mock Chat: IA e Humano).
- [ ] Conectar o botão "Testar no Simulador" da barra superior do Builder para abrir (toggle state) este componente de Chat.
- [ ] Comitar todas as alterações sob `feat(automation): add multi-workflow state, correct drag drop offset and build chat simulator`.
