# Design Document: SDR Triggers & Simulation

## 1. Arquitetura de Estado (Multi-Workflow)
Para permitir que a tela suporte vários fluxos, o estado do componente `SDRBuilderContent` deve evoluir:

```typescript
interface Workflow {
  id: string;
  name: string;
  isActive: boolean;
  nodes: Node[];
  edges: Edge[];
}

// O estado principal passará a ser a lista de Workflows
const [workflows, setWorkflows] = useState<Workflow[]>([
  { id: '1', name: 'Qualificação Padrão', isActive: true, nodes: defaultNodes, edges: defaultEdges },
  { id: '2', name: 'Resgate de Leads', isActive: false, nodes: [triggerOnly], edges: [] }
]);
const [activeWorkflowId, setActiveWorkflowId] = useState('1');
```

Sempre que `nodes` ou `edges` mudarem no Canvas, eles devem ser sincronizados de volta no item correspondente do array `workflows`.

## 2. A Correção do Drag & Drop (React Flow v12)
O problema de offset acontece por uma mudança na API do React Flow. Na versão 12, a função `screenToFlowPosition` não exige mais a subtração das margens do contêiner (`reactFlowBounds`), pois já resolve internamente usando o ClientX e ClientY do evento de Mouse.
**Código Corrigido:**
```typescript
const position = reactFlowInstance.screenToFlowPosition({
  x: event.clientX,
  y: event.clientY,
});
```

## 3. Painel de Propriedades: Nó Trigger (Início)
Quando `selectedNode.type === 'trigger'`, a Right Sidebar (Painel Direto) deve renderizar o bloco de configuração "Gatilho de Ativação".

### Propriedades Injetadas:
- **Público (Audience):** `<Select>` com [Todos, Somente Clientes, Somente Desconhecidos]. Salvo em `data.config.target_audience`.
- **Regra de Estágio (Stage Rule):** `<Select>` com [Qualquer Etapa, Fora de Funil, Funil/Etapa Específica]. Salvo em `data.config.stage_rule`.
- **Etapa/Funil Específico:** Se a regra acima for específica, abre-se um dropdown secundário populado com as etapas cadastradas no CRM do usuário (mockado com as etapas hardcoded atuais ou buscadas do hook se disponível).

## 4. Simulador (Chat Flutuante)
Uma nova UI, `SDRSimulator.tsx`, será incorporada à tela do Builder.
- É um "Widget" posicionado sobre o Canvas (geralmente fixado no canto inferior direito, ou uma Drawer lateral inteira).
- **Interface:** Header verde ("Simulador Tork AI"), área de mensagens (balões cinza e verdes) e input inferior com botão de Enviar.
- **Lógica Básica:** 
  - Ao abrir, ele manda um balão da IA baseado no fluxo ativo (ex: Se a primeira mensagem é de boas-vindas, exibe ela).
  - Como a integração de LLM completa requer back-end robusto, por agora faremos um `dummy echo` com delay, exibindo uma simulação (mock) do comportamento.
  - Ao fechar o simulador, a conversa é resetada.
