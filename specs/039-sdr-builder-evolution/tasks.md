# Checklist de Tarefas: 039 SDR Builder Evolution

## Fase 1: Deleção e Interatividade Básica
- [ ] Adicionar suporte a `deleteKeyCode={['Backspace', 'Delete']}` no componente `ReactFlow` do `SDRBuilder.tsx`.
- [ ] Adicionar um botão de "🗑️ Excluir" no rodapé da Right Sidebar de propriedades que chame uma função `deleteNode(id)` para limpar do estado do canvas.

## Fase 2: Painel de Propriedades Dinâmico (Binding)
- [ ] Criar a função genérica `updateNodeData(key, value)` no `SDRBuilderContent`.
- [ ] Conectar o `<Input>` do Nome do Nó para editar `node.data.label` em tempo real.
- [ ] Conectar os `<Textarea>`, `<select>`, e `<input type="radio">` das Tools Dinâmicas às propriedades dentro de `node.data.config` (ex: `data.config.message_template`).
- [ ] Adicionar textos de resumo explicativos (ex: "A IA avaliará a condição e seguirá pelo caminho Verde ou Vermelho") acima das propriedades no Right Sidebar.

## Fase 3: Custom Nodes (Nós com Múltiplas Saídas)
- [ ] Criar a pasta `src/components/automation/builder/nodes/`.
- [ ] Criar `DecisionNode.tsx`: Deve conter uma `<Handle type="target" position={Position.Top} />` e duas `<Handle type="source" position={Position.Bottom} id="true" />` / `id="false"`. O estilo deve incorporar ícones customizados.
- [ ] Criar `ActionNode.tsx`: Deve ter a Handle default e uma Handle lateral de `Error`.
- [ ] Atualizar o mapeamento no `SDRBuilder.tsx` para passar o objeto `nodeTypes={customNodeTypes}` para o `ReactFlow`.
- [ ] Ao arrastar a Tool de Decisão ou Ganho/Perda, o construtor deve definir a prop `type: 'decision'` ou `type: 'action'` no objeto, garantindo que sejam renderizados como Componentes Customizados em vez de Default.

## Fase 4: Workflow Manager (Lifecycle UI)
- [ ] Refatorar o Layout Geral do Builder: Criar um cabeçalho superior (`TopBar`) exclusivo pro Canvas.
- [ ] Adicionar Switch/Toggle: "Modo Produção / Modo Rascunho".
- [ ] Adicionar Título editável: "Meu Novo Fluxo de Qualificação".
- [ ] Adicionar um Botão (Simulador) "▶️ Rodar Teste" que abra uma gavetinha lateral (Drawer) simulando um Chat de WhatsApp, onde o usuário pode validar se o Fluxo programado (mesmo mockado) responde de forma congruente.
- [ ] Adicionar o Botão Primário "Salvar Fluxo".

## Fase 5: Estrutura de Multi-Workflows
- [ ] Substituir o "Ferramentas" na Left Sidebar por uma navegação em Abas (Tabs) internas da Sidebar Esquerda: **"Ferramentas"** e **"Meus Fluxos"**.
- [ ] A aba **Meus Fluxos** deve mostrar uma lista de "Cards" com o título de fluxos previamente criados (mockados inicialmente com "Fluxo de Venda Auto", "Cobrança de Boleto") com um botão "➕ Criar Novo".
- [ ] Comitar as evoluções na arquitetura do Builder.
