# Design Document: SDR Builder Evolution

## 1. Arquitetura de Componentes (React Flow Custom Nodes)
A dependência básica de apenas passar `type: 'default'` e `className` coloridos não funciona para um motor real de fluxos complexos (Múltiplas Saídas). Precisaremos criar três novos componentes para servirem de "Tipos de Nó" do Flow.

```typescript
// src/components/automation/builder/nodes/index.ts
import { ToolNode } from './ToolNode';
import { DecisionNode } from './DecisionNode';
import { MessageNode } from './MessageNode';
import { TriggerNode } from './TriggerNode';

export const nodeTypes = {
  tool: ToolNode, // Cria handles target(top) e sources: success(bottom), error(right)
  decision: DecisionNode, // Cria handles target(top) e sources: true(bottom-left, green), false(bottom-right, red)
  message: MessageNode, // Cria handles target(top) e source: default(bottom)
  trigger: TriggerNode // Apenas source(bottom)
};
```

Ao registrar `nodeTypes={nodeTypes}` no `<ReactFlow>`, a renderização das ferramentas arrastadas passa a ser inteligente.

## 2. Binding do Properties Panel (Sidebar)
O painel lateral (`selectedNode`) deverá invocar atualizações síncronas usando a função do React Flow `setNodes()`. 

**Estratégia:**
- Quando um campo é editado (Ex: `onChange` num Input), rodar um updater:
```tsx
const updateNodeData = (key: string, value: any) => {
  setNodes((nds) => 
    nds.map((node) => {
      if (node.id === selectedNode.id) {
        // Atualiza a visualização local do Node properties imediatamente
        setSelectedNode({ ...node, data: { ...node.data, [key]: value } });
        // Atualiza o array de Nodes geral do Canvas
        return { ...node, data: { ...node.data, [key]: value } };
      }
      return node;
    })
  );
};
```

## 3. Comportamento de Deleção (Interatividade)
- **Teclado:** Adicionar as props no `ReactFlow`: `deleteKeyCode={['Backspace', 'Delete']}` e certificar de mapear as funções `onNodesDelete` e `onEdgesDelete` se houver cleanup adicional necessário.
- **UI:** No rodapé do painel de propriedades, inserir um `<Button variant="destructive" onClick={() => deleteNode(selectedNode.id)}>` que filtre os `nodes` e `edges` removendo tudo atrelado àquele ID, disparando `setNodes` e limpando o `setSelectedNode(null)`.

## 4. O Gerenciador de Fluxos (Workflows Manager)
O arquivo `SDRBuilder.tsx` original deve ser transformado no "Canvas View". Um componente pai (ex: `SDRWorkflowsManager.tsx`) deve contê-lo.
- **Sidebar Esquerda Principal:** Listará "Workflows Criados" (Ex: Novo Fluxo, Fluxo de Cobrança, Fluxo Triagem). Ao clicar, carrega-se o estado (`nodes`, `edges`) respectivo.
- **Header do Canvas:** Uma barra de ferramentas superior (`TopBar`) contendo:
  - Título Editável (Ex: Fluxo Principal).
  - Badge de Status: "🟢 Produção" ou "🟠 Rascunho".
  - Toggle `Ativo/Inativo`.
  - Botão de `Testar IA` (Abre modal de Chat Simulado que passa o JSON dos Nodes como system prompt no request).
  - Botão Primário `Salvar & Publicar` (Manda um JSON stringificado do layout e configuração da engine pro Supabase: `crm_sdr_workflows`).

## 5. Estrutura de Tabela Sugerida (Futuro Backend)
Para suportar o salvamento em vez de `setTimeout` mockado, a tabela precisará (a ser criado num PR futuro):
`crm_sdr_workflows`
- `id` (UUID)
- `user_id` (UUID)
- `name` (String)
- `description` (Text)
- `is_active` (Boolean)
- `trigger_event` (String: ex 'inbound_message')
- `nodes` (JSONB)
- `edges` (JSONB)
- `updated_at` (Timestamp)
