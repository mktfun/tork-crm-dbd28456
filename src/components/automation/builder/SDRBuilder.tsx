import React, { useState, useCallback, useRef } from 'react';
import { ReactFlow, Controls, Background, addEdge, useNodesState, useEdgesState, Connection, Edge, Node, Panel, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Settings2, Save, Wand2, Plus, GripVertical, Trash2, Play, CircleDot, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { customNodeTypes } from './nodes/CustomNodes';

// Tools available for drag-and-drop
const AVAILABLE_TOOLS = [
  { type: 'action', nodeType: 'tool_create_client', label: '👤 Criar Cliente', color: 'bg-emerald-500/10 dark:bg-emerald-900/40 border-emerald-500/30' },
  { type: 'action', nodeType: 'tool_search_policy', label: '📄 Buscar Apólice', color: 'bg-blue-500/10 dark:bg-blue-900/40 border-blue-500/30' },
  { type: 'action', nodeType: 'tool_financial', label: '💰 Consultar Financeiro', color: 'bg-amber-500/10 dark:bg-amber-900/40 border-amber-500/30' },
  { type: 'action', nodeType: 'action_move_deal', label: '🔄 Mover Negociação', color: 'bg-indigo-500/10 dark:bg-indigo-900/40 border-indigo-500/30' },
  { type: 'action', nodeType: 'action_close_deal', label: '🏆 Ganho / ❌ Perda', color: 'bg-red-500/10 dark:bg-red-900/40 border-red-500/30' },
  { type: 'message', nodeType: 'action_send_text', label: '💬 Enviar Texto Padrão', color: 'bg-cyan-500/10 dark:bg-cyan-900/40 border-cyan-500/30' },
  { type: 'action', nodeType: 'action_custom_prompt', label: '🧠 Instrução Livre', color: 'bg-fuchsia-500/10 dark:bg-fuchsia-900/40 border-fuchsia-500/30' },
  { type: 'decision', nodeType: 'decision_condition', label: '🔀 Decisão (Se... Então)', color: 'bg-yellow-500/10 dark:bg-yellow-900/40 border-yellow-500/30' },
];

const initialNodes: Node[] = [
  {
    id: 'trigger',
    type: 'trigger',
    data: { label: 'Início da Conversa' },
    position: { x: 250, y: 25 },
  },
  {
    id: 'qualify',
    type: 'decision',
    data: { label: 'Qualificação (Lead)', color: 'bg-yellow-500/10 border-yellow-500/30', config: { condition: 'Cliente pediu cotação?' } },
    position: { x: 250, y: 125 },
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

  const onDragStart = (event: React.DragEvent, type: string, nodeType: string, label: string, color: string) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ type, nodeType, label, color }));
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
        type: nodeData.type,
        position,
        data: { 
          label: nodeData.label, 
          nodeType: nodeData.nodeType, 
          color: nodeData.color,
          config: {} // Start with empty config
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  const updateNodeData = (key: string, value: any) => {
    if (!selectedNode) return;
    
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const newData = {
            ...node.data,
            config: {
              ...(node.data.config as Record<string, any>),
              [key]: value
            }
          };
          // Sync local state for immediate re-render of sidebar
          setSelectedNode({ ...node, data: newData });
          return { ...node, data: newData };
        }
        return node;
      })
    );
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    toast.success("Bloco removido com sucesso!");
  };

  const handleSave = async () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Fluxo publicado com sucesso!');
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-background/50 relative">
      {/* TopBar Lifecycle Header */}
      <div className="h-14 bg-card/60 backdrop-blur-xl border-b border-border/50 z-10 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Input 
            defaultValue="Fluxo de Qualificação Padrão" 
            className="h-8 bg-transparent border-transparent hover:border-border focus:border-border font-semibold text-foreground w-72 shadow-none" 
          />
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 hidden sm:flex">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Em Produção
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => toast.info('O simulador de chat abrirá uma janela para testes.')}>
            <Play className="w-4 h-4 mr-2 text-primary" />
            <span className="hidden sm:inline">Testar no Simulador</span>
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="shadow-[0_0_15px_rgba(var(--primary),0.3)]">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Publicar
          </Button>
        </div>
      </div>

      {/* Main Builder Layout */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Sidebar (Tabs: Tools & Flows) */}
        <div className="w-72 border-r border-border/50 bg-card/40 backdrop-blur-xl flex flex-col z-10">
          <Tabs defaultValue="tools" className="flex flex-col h-full w-full">
            <div className="p-3 pb-0">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="tools">Ferramentas</TabsTrigger>
                <TabsTrigger value="flows">Fluxos</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="tools" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
              <p className="text-xs text-muted-foreground">Arraste os blocos para o canvas para dar ações, decisões e inteligência à IA.</p>
              <div className="space-y-2">
                {AVAILABLE_TOOLS.map((tool) => (
                  <div
                    key={tool.nodeType}
                    onDragStart={(event) => onDragStart(event, tool.type, tool.nodeType, tool.label, tool.color)}
                    draggable
                    className={`p-3 rounded-lg border cursor-grab hover:brightness-110 transition-all flex items-center gap-2 ${tool.color}`}
                  >
                    <GripVertical className="w-4 h-4 opacity-50" />
                    <span className="text-sm font-medium">{tool.label}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="flows" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
              <div className="p-3 rounded-xl border border-primary/50 bg-primary/5 cursor-pointer transition-colors shadow-sm">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <CircleDot className="w-3.5 h-3.5 text-emerald-500" />
                  Fluxo Padrão
                </h4>
                <p className="text-xs text-muted-foreground mt-1">4 ferramentas ativas</p>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card/50 hover:border-primary/50 cursor-pointer transition-colors shadow-sm">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <CircleDot className="w-3.5 h-3.5 text-amber-500" />
                  Triagem Noturna
                </h4>
                <p className="text-xs text-muted-foreground mt-1">Rascunho • 8 nós</p>
              </div>
              <Button variant="outline" className="w-full mt-4 border-dashed bg-transparent hover:bg-muted/50">
                <Plus className="w-4 h-4 mr-2" /> Novo Fluxo
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={customNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            deleteKeyCode={['Backspace', 'Delete']}
            fitView
            className="bg-dot-white/[0.2] dark:bg-dot-white/[0.05]"
          >
            <Background gap={16} size={1} color="rgba(255,255,255,0.1)" />
            <Controls className="bg-card border-border fill-foreground shadow-xl" />
          </ReactFlow>
        </div>

        {/* Properties Sidebar (Right) */}
        <div className={`w-80 border-l border-border/50 bg-card/60 backdrop-blur-2xl flex flex-col transition-all duration-300 absolute right-0 h-full z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
          {selectedNode ? (
            <div className="p-6 flex flex-col h-full overflow-y-auto">
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
                  <div className="p-2 bg-muted/50 rounded-md border border-border/50 font-medium text-foreground">
                    {selectedNode.data.label as string}
                  </div>
                </div>

                {/* TYPE: DECISION */}
                {selectedNode.type === 'decision' && (
                  <div className="space-y-3 pt-4 border-t border-border/30">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                      Decisão Lógica
                    </Badge>
                    <p className="text-xs text-muted-foreground">A IA avaliará esta condição para determinar qual saída utilizar na árvore (Caminho Verde ou Vermelho).</p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Condição de Avaliação (Se...)</label>
                      <Input 
                        placeholder="Ex: O cliente pediu cotação auto?" 
                        value={selectedNode.data.config?.condition || ''}
                        onChange={(e) => updateNodeData('condition', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* TYPE: MESSAGE */}
                {selectedNode.type === 'message' && (
                  <div className="space-y-3 pt-4 border-t border-border/30">
                    <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
                      Mensagem da IA
                    </Badge>
                    <p className="text-xs text-muted-foreground">A IA enviará exatamente este texto ao usuário (sem invenções).</p>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Texto Fixo (Template)</label>
                      <Textarea 
                        placeholder="Ex: Obrigado pelo contato! Retornaremos em breve." 
                        className="resize-none h-24"
                        value={selectedNode.data.config?.message_template || ''}
                        onChange={(e) => updateNodeData('message_template', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* TYPE: ACTION (CRM Tools) */}
                {selectedNode.type === 'action' && selectedNode.data.nodeType?.toString().includes('tool_') && (
                  <div className="space-y-3 pt-4 border-t border-border/30">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      Ferramenta CRM (Tool)
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      A IA pode utilizar esta ferramenta autônoma para consultar ou gravar dados. A saída lateral (vermelha) é ativada se a API falhar.
                    </p>
                    <div className="p-3 bg-muted/20 rounded-lg border border-border/50 flex items-center justify-between">
                      <span className="text-sm">Obrigatório antes de continuar?</span>
                      <input 
                        type="checkbox" 
                        className="toggle" 
                        checked={selectedNode.data.config?.is_required || false}
                        onChange={(e) => updateNodeData('is_required', e.target.checked)}
                      />
                    </div>
                  </div>
                )}

                {/* TYPE: ACTION (Move Deal) */}
                {selectedNode.type === 'action' && selectedNode.data.nodeType === 'action_move_deal' && (
                  <div className="space-y-3 pt-4 border-t border-border/30">
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">
                      Ação de Funil
                    </Badge>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Etapa de Destino (Pipeline)</label>
                      <select 
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={selectedNode.data.config?.target_stage || ''}
                        onChange={(e) => updateNodeData('target_stage', e.target.value)}
                      >
                        <option value="">Selecione uma etapa...</option>
                        <option value="qualificacao">Qualificação</option>
                        <option value="apresentacao">Apresentação de Proposta</option>
                        <option value="negociacao">Negociação</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TYPE: ACTION (Close Deal) */}
                {selectedNode.type === 'action' && selectedNode.data.nodeType === 'action_close_deal' && (
                  <div className="space-y-3 pt-4 border-t border-border/30">
                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                      Fechamento de Negócio
                    </Badge>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status a Aplicar</label>
                      <div className="flex items-center gap-4 mt-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input 
                            type="radio" 
                            name="close_status" 
                            value="won"
                            checked={selectedNode.data.config?.close_status === 'won'}
                            onChange={(e) => updateNodeData('close_status', e.target.value)}
                          /> Ganho
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input 
                            type="radio" 
                            name="close_status" 
                            value="lost"
                            checked={selectedNode.data.config?.close_status === 'lost'}
                            onChange={(e) => updateNodeData('close_status', e.target.value)}
                          /> Perda
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* TYPE: ACTION (Custom Prompt) */}
                {selectedNode.type === 'action' && selectedNode.data.nodeType === 'action_custom_prompt' && (
                  <div className="space-y-3 pt-4 border-t border-border/30">
                    <Badge variant="outline" className="bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20">
                      Intrução Cognitiva Dinâmica
                    </Badge>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Comando Livre (Prompt)</label>
                      <Textarea 
                        placeholder="Ex: Peça a placa do veículo antes de avançar para a cotação." 
                        className="resize-none h-32"
                        value={selectedNode.data.config?.prompt_override || ''}
                        onChange={(e) => updateNodeData('prompt_override', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 space-y-2 border-t border-border/30 pt-4">
                <Button className="w-full text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/20" variant="outline" onClick={deleteSelectedNode}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Nó
                </Button>
                <Button className="w-full" variant="secondary" onClick={() => setSelectedNode(null)}>
                  Fechar Painel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
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
