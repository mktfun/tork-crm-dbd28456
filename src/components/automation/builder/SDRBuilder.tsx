import React, { useState, useCallback, useRef } from 'react';
import { ReactFlow, Controls, Background, addEdge, useNodesState, useEdgesState, Connection, Edge, Node, Panel, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Settings2, Save, Wand2, Plus, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

// Ferramentas disponíveis para arrastar
const AVAILABLE_TOOLS = [
  { type: 'tool_create_client', label: '👤 Criar Cliente', color: 'bg-emerald-500/10 dark:bg-emerald-900/40 border-emerald-500/30' },
  { type: 'tool_search_policy', label: '📄 Buscar Apólice', color: 'bg-blue-500/10 dark:bg-blue-900/40 border-blue-500/30' },
  { type: 'tool_financial', label: '💰 Consultar Financeiro', color: 'bg-amber-500/10 dark:bg-amber-900/40 border-amber-500/30' },
  { type: 'action_move_deal', label: '🔄 Mover Negociação', color: 'bg-indigo-500/10 dark:bg-indigo-900/40 border-indigo-500/30' },
  { type: 'action_close_deal', label: '🏆 Ganho / ❌ Perda', color: 'bg-red-500/10 dark:bg-red-900/40 border-red-500/30' },
  { type: 'action_send_text', label: '💬 Enviar Texto Padrão', color: 'bg-cyan-500/10 dark:bg-cyan-900/40 border-cyan-500/30' },
  { type: 'action_custom_prompt', label: '🧠 Instrução Livre', color: 'bg-fuchsia-500/10 dark:bg-fuchsia-900/40 border-fuchsia-500/30' },
  { type: 'decision_condition', label: '🔀 Decisão (Se... Então)', color: 'bg-yellow-500/10 dark:bg-yellow-900/40 border-yellow-500/30' },
];

const initialNodes: Node[] = [
  {
    id: 'trigger',
    type: 'input',
    data: { label: 'Início da Conversa' },
    position: { x: 250, y: 25 },
    className: 'bg-primary/20 dark:bg-primary/30 border-primary text-foreground rounded-lg p-3 font-semibold shadow-lg backdrop-blur-md',
  },
  {
    id: 'qualify',
    data: { label: 'Qualificação (Lead)' },
    position: { x: 250, y: 125 },
    className: 'bg-card border-border text-card-foreground rounded-lg p-3 shadow-lg',
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'trigger', target: 'qualify', animated: true },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

function SDRBuilderContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string, color: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type: nodeType, label, color }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeDataStr = event.dataTransfer.getData('application/reactflow');
      
      if (!nodeDataStr || !reactFlowInstance || !reactFlowBounds) {
        return;
      }

      const nodeData = JSON.parse(nodeDataStr);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: getId(),
        type: 'default',
        position,
        data: { label: nodeData.label },
        className: `${nodeData.color} text-foreground rounded-lg p-3 shadow-lg`,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Fluxo SDR salvo com sucesso!');
    }, 1000);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] w-full bg-background/50 relative">
      {/* Left Sidebar (Tool Palette) */}
      <div className="w-64 border-r border-border/50 bg-card/40 backdrop-blur-xl p-4 flex flex-col z-10">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2 text-muted-foreground">
          <Wand2 className="w-4 h-4" /> Ferramentas (Tools)
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Arraste as ferramentas para o canvas para dar novas habilidades à IA.</p>
        <div className="space-y-2 flex-1 overflow-y-auto">
          {AVAILABLE_TOOLS.map((tool) => (
            <div
              key={tool.type}
              onDragStart={(event) => onDragStart(event, tool.type, tool.label, tool.color)}
              draggable
              className={`p-3 rounded-lg border cursor-grab hover:brightness-110 transition-all flex items-center gap-2 ${tool.color}`}
            >
              <GripVertical className="w-4 h-4 opacity-50" />
              <span className="text-sm font-medium">{tool.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={(_, node) => setSelectedNode(node)}
          fitView
          className="bg-dot-white/[0.2] dark:bg-dot-white/[0.05]"
        >
          <Background gap={16} size={1} color="rgba(255,255,255,0.1)" />
          <Controls className="bg-card border-border fill-foreground" />
          
          <Panel position="top-right" className="flex gap-2 mr-10">
            <Button onClick={handleSave} disabled={saving} className="shadow-lg shadow-primary/20">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Fluxo
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Properties Sidebar (Right) */}
      <div className={`w-80 border-l border-border/50 bg-card/40 backdrop-blur-xl flex flex-col transition-all duration-300 absolute right-0 h-full z-20 ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedNode ? (
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Propriedades
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
                &times;
              </Button>
            </div>
            
            <div className="space-y-4 flex-1">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Nome do Nó</label>
                <div className="p-2 bg-muted/30 rounded border border-border/50 font-medium">
                  {selectedNode.data.label as string}
                </div>
              </div>
              
              {selectedNode.data.label.toString().includes('⚙️') && (
                <div className="space-y-3 pt-4 border-t border-border/30">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Ferramenta (Tool)
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Esta ferramenta permite que a IA execute ações autônomas na base de dados.
                  </p>
                  <div className="p-3 bg-muted/20 rounded-lg border border-border/50 flex items-center justify-between">
                    <span className="text-sm">Status Ativo</span>
                    <input type="checkbox" defaultChecked className="toggle" />
                  </div>
                </div>
              )}

              {selectedNode.type === 'action_move_deal' || selectedNode.data.label.toString().includes('🔄') ? (
                <div className="space-y-3 pt-4 border-t border-border/30">
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                    Ação de CRM
                  </Badge>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Etapa de Destino</label>
                    <select className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                      <option>Qualificação</option>
                      <option>Apresentação de Proposta</option>
                      <option>Negociação</option>
                    </select>
                  </div>
                </div>
              ) : null}

              {selectedNode.type === 'action_close_deal' || selectedNode.data.label.toString().includes('🏆') ? (
                <div className="space-y-3 pt-4 border-t border-border/30">
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    Fechamento
                  </Badge>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status a Aplicar</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="close_status" defaultChecked /> Ganho
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="close_status" /> Perda
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedNode.type === 'action_send_text' || selectedNode.data.label.toString().includes('💬') ? (
                <div className="space-y-3 pt-4 border-t border-border/30">
                  <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
                    Mensagem
                  </Badge>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Texto Fixo (Template)</label>
                    <Textarea 
                      placeholder="Ex: Obrigado pelo contato! Nossos consultores retornarão em breve." 
                      className="resize-none h-24"
                    />
                  </div>
                </div>
              ) : null}

              {selectedNode.type === 'action_custom_prompt' || selectedNode.data.label.toString().includes('🧠') ? (
                <div className="space-y-3 pt-4 border-t border-border/30">
                  <Badge variant="outline" className="bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20">
                    Processamento Cognitivo
                  </Badge>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Instrução Secreta (Prompt)</label>
                    <Textarea 
                      placeholder="Ex: Se o cliente pedir o preço, primeiro pergunte a placa do veículo antes de responder." 
                      className="resize-none h-32"
                    />
                    <p className="text-xs text-muted-foreground">A IA interpretará isso dinamicamente na jornada.</p>
                  </div>
                </div>
              ) : null}

              {selectedNode.type === 'decision_condition' || selectedNode.data.label.toString().includes('🔀') ? (
                <div className="space-y-3 pt-4 border-t border-border/30">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    Decisão Lógica
                  </Badge>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Condição (Se...)</label>
                    <Input placeholder="Ex: O cliente demonstrou objeção ao preço?" />
                    <p className="text-xs text-muted-foreground">O fluxo se dividirá em duas saídas: Verdadeiro ou Falso.</p>
                  </div>
                </div>
              ) : null}
            </div>
            
            <Button className="w-full mt-4" variant="secondary" onClick={() => setSelectedNode(null)}>
              Fechar
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SDRBuilder() {
  return (
    <ReactFlowProvider>
      <SDRBuilderContent />
    </ReactFlowProvider>
  );
}
