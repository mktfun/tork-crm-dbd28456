import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { SDRSimulator } from './SDRSimulator';
import { useSDRWorkflows } from '@/hooks/useSDRWorkflows';

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
  { type: 'escalation', nodeType: 'action_escalate', label: '🎧 Escalar p/ Humano', color: 'bg-rose-500/10 dark:bg-rose-900/40 border-rose-500/30' },
];

let idCounter = 0;
const getUniqueId = () => `dndnode_${Date.now()}_${idCounter++}`;

const defaultTriggerNode: Node = {
  id: 'trigger',
  type: 'trigger',
  data: { label: 'Início da Conversa', config: { target_audience: 'Todos', stage_rule: 'Qualquer Etapa' } },
  position: { x: 250, y: 25 },
};

function SDRBuilderContent() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { workflows, isLoading: loadingWfs, upsertWorkflow, deleteWorkflow } = useSDRWorkflows();
  
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [isActive, setIsActive] = useState(false);
  
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);

  // Initialize with the first workflow or create a default one
  useEffect(() => {
    if (!loadingWfs && workflows.length > 0 && !activeWorkflowId) {
      const first = workflows[0];
      setActiveWorkflowId(first.id);
      setNodes(first.nodes);
      setEdges(first.edges);
      setWorkflowName(first.name);
      setIsActive(first.is_active);
    } else if (!loadingWfs && workflows.length === 0 && !activeWorkflowId) {
      // Create initial local state for a new workflow
      setNodes([defaultTriggerNode]);
      setEdges([]);
      setWorkflowName('Fluxo SDR Inicial');
      setIsActive(false);
    }
  }, [workflows, loadingWfs, activeWorkflowId, setNodes, setEdges]);

  const switchWorkflow = (id: string) => {
    const wf = workflows.find(w => w.id === id);
    if (wf) {
      setActiveWorkflowId(id);
      setNodes(wf.nodes);
      setEdges(wf.edges);
      setWorkflowName(wf.name);
      setIsActive(wf.is_active);
      setSelectedNode(null);
    }
  };

  const handleCreateNew = () => {
    setActiveWorkflowId(null);
    setNodes([defaultTriggerNode]);
    setEdges([]);
    setWorkflowName('Novo Fluxo SDR');
    setIsActive(false);
    setSelectedNode(null);
    toast.info('Criando novo rascunho...');
  };

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
      const nodeDataStr = event.dataTransfer.getData('application/reactflow');
      if (!nodeDataStr || !reactFlowInstance) return;

      const nodeData = JSON.parse(nodeDataStr);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getUniqueId(),
        type: nodeData.type,
        position,
        data: { 
          label: nodeData.label, 
          nodeType: nodeData.nodeType, 
          color: nodeData.color,
          config: {} 
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
          let newData;
          if (key === 'label') {
            newData = { ...node.data, label: value };
          } else {
            newData = {
              ...node.data,
              config: {
                ...(node.data.config as Record<string, any>),
                [key]: value
              }
            };
          }
          setSelectedNode({ ...node, data: newData });
          return { ...node, data: newData };
        }
        return node;
      })
    );
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    if (selectedNode.id === 'trigger' || selectedNode.type === 'trigger') {
      toast.error("O nó de início não pode ser removido.");
      return;
    }
    setNodes(nds => nds.filter(n => n.id !== selectedNode.id));
    setEdges(eds => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
    toast.success("Bloco removido!");
  };

  const handleSave = async () => {
    // Extract trigger config for top-level column
    const triggerNode = nodes.find(n => n.type === 'trigger');
    const trigger_config = triggerNode?.data.config || {};

    try {
      const result = await upsertWorkflow.mutateAsync({
        id: activeWorkflowId || undefined,
        name: workflowName,
        is_active: isActive,
        nodes,
        edges,
        trigger_config
      });
      
      if (!activeWorkflowId) {
        setActiveWorkflowId(result.id);
      }
      toast.success('Workflow publicado com sucesso!');
    } catch (e) {
      // toast handled in hook
    }
  };

  if (loadingWfs) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background/5 relative overflow-hidden">
      {/* TopBar */}
      <div className="h-14 bg-card/60 backdrop-blur-xl border-b border-border/50 z-10 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Input 
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="h-8 bg-transparent border-transparent hover:border-border focus:border-border font-semibold text-foreground w-72 shadow-none" 
          />
          <Badge 
            variant="outline" 
            className={`gap-1.5 cursor-pointer hover:opacity-80 transition-opacity ${isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}
            onClick={() => setIsActive(!isActive)}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isActive ? 'Em Produção' : 'Rascunho Inativo'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSimulatorOpen(!simulatorOpen)}>
            <Play className="w-4 h-4 mr-2 text-primary" />
            <span className="hidden sm:inline">Testar no Simulador</span>
          </Button>
          <Button onClick={handleSave} disabled={upsertWorkflow.isPending} size="sm" className="shadow-[0_0_15px_rgba(var(--primary),0.3)] min-w-[100px]">
            {upsertWorkflow.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvar Tudo
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 relative">
        {/* Left Sidebar */}
        <div className="w-72 border-r border-border/50 bg-card/40 backdrop-blur-xl flex flex-col z-10">
          <Tabs defaultValue="tools" className="flex flex-col h-full w-full">
            <div className="p-3 pb-0">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="tools">Ferramentas</TabsTrigger>
                <TabsTrigger value="flows">Fluxos</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="tools" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
              <p className="text-xs text-muted-foreground font-medium">Arraste para o canvas:</p>
              <div className="space-y-2">
                {AVAILABLE_TOOLS.map((tool) => (
                  <div
                    key={tool.nodeType}
                    onDragStart={(event) => onDragStart(event, tool.type, tool.nodeType, tool.label, tool.color)}
                    draggable
                    className={`p-3 rounded-lg border cursor-grab hover:brightness-110 transition-all flex items-center gap-2 ${tool.color} shadow-sm`}
                  >
                    <GripVertical className="w-4 h-4 opacity-50" />
                    <span className="text-sm font-medium text-foreground">{tool.label}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="flows" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
              {workflows.map(wf => (
                <div 
                  key={wf.id}
                  onClick={() => switchWorkflow(wf.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all shadow-sm
                    ${activeWorkflowId === wf.id 
                      ? 'border-primary bg-primary/10 scale-[1.02]' 
                      : 'border-border bg-card/50 hover:border-primary/30'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground truncate max-w-[150px]">
                      <CircleDot className={`w-3.5 h-3.5 ${wf.is_active ? 'text-emerald-500' : 'text-amber-500'}`} />
                      {wf.name}
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); if(confirm('Excluir este fluxo?')) deleteWorkflow.mutate(wf.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {wf.is_active ? 'Ativo' : 'Rascunho'} • {wf.nodes.length} blocos
                  </p>
                </div>
              ))}
              
              <Button variant="outline" className="w-full mt-4 border-dashed bg-transparent hover:bg-muted/50 py-6" onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" /> Novo Fluxo SDR
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden" ref={reactFlowWrapper}>
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

          <SDRSimulator 
            open={simulatorOpen} 
            onClose={() => setSimulatorOpen(false)} 
            workflowName={workflowName}
            workflowData={{ nodes, edges }}
          />
        </div>

        {/* Right Sidebar */}
        <div className={`w-80 border-l border-border/50 bg-card/60 backdrop-blur-2xl flex flex-col transition-all duration-300 absolute right-0 h-full z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
          {selectedNode ? (
            <div className="p-6 flex flex-col h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  Propriedades
                </h3>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedNode(null)}>
                  <Plus className="w-5 h-5 rotate-45" />
                </Button>
              </div>
              
              <div className="space-y-4 flex-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Bloco</label>
                  <Input 
                    className="bg-background/50 border-border/50 font-medium text-foreground h-10"
                    value={selectedNode.data.label as string}
                    onChange={(e) => updateNodeData('label', e.target.value)}
                  />
                </div>

                {/* TYPE: TRIGGER */}
                {selectedNode.type === 'trigger' && (
                  <div className="space-y-4 pt-4 border-t border-border/30">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Gatilho Inicial</Badge>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Público-Alvo</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={(selectedNode.data.config as any)?.target_audience || 'Todos'}
                        onChange={(e) => updateNodeData('target_audience', e.target.value)}
                      >
                        <option value="Todos">Todos os Contatos</option>
                        <option value="Somente Clientes">Somente Clientes</option>
                        <option value="Somente Desconhecidos">Somente Desconhecidos</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Regra de Etapa (Funil)</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={(selectedNode.data.config as any)?.stage_rule || 'Qualquer Etapa'}
                        onChange={(e) => updateNodeData('stage_rule', e.target.value)}
                      >
                        <option value="Qualquer Etapa">Qualquer Etapa / Situação</option>
                        <option value="Fora de Funil">Sem Funil (Apenas Contato)</option>
                        <option value="Qualificacao">Etapa: Qualificação</option>
                        <option value="Negociacao">Etapa: Negociação</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* TYPE: DECISION */}
                {selectedNode.type === 'decision' && (
                  <div className="space-y-4 pt-4 border-t border-border/30">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Decisão Lógica</Badge>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Condição (Se...)</label>
                      <Input 
                        placeholder="Ex: Pediu cotação?" 
                        className="bg-background/50"
                        value={(selectedNode.data.config as any)?.condition || ''}
                        onChange={(e) => updateNodeData('condition', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* TYPE: MESSAGE */}
                {selectedNode.type === 'message' && (
                  <div className="space-y-4 pt-4 border-t border-border/30">
                    <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20">Mensagem da IA</Badge>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Texto (Template)</label>
                      <Textarea 
                        placeholder="Escreva a resposta..." 
                        className="resize-none h-24 bg-background/50"
                        value={(selectedNode.data.config as any)?.message_template || ''}
                        onChange={(e) => updateNodeData('message_template', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* TYPE: ACTION (Tools/CRM) */}
                {selectedNode.type === 'action' && (
                  <div className="space-y-4 pt-4 border-t border-border/30">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Ação de Sistema</Badge>
                    
                    {selectedNode.data.nodeType === 'action_move_deal' && (
                       <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Etapa de Destino</label>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          value={(selectedNode.data.config as any)?.target_stage || ''}
                          onChange={(e) => updateNodeData('target_stage', e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          <option value="qualificacao">Qualificação</option>
                          <option value="apresentacao">Apresentação</option>
                          <option value="negociacao">Negociação</option>
                        </select>
                      </div>
                    )}

                    {selectedNode.data.nodeType === 'action_close_deal' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Status do Negócio</label>
                        <div className="flex items-center gap-4 mt-2">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name="close_status" value="won" checked={(selectedNode.data.config as any)?.close_status === 'won'} onChange={(e) => updateNodeData('close_status', e.target.value)} /> Ganho
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name="close_status" value="lost" checked={(selectedNode.data.config as any)?.close_status === 'lost'} onChange={(e) => updateNodeData('close_status', e.target.value)} /> Perda
                          </label>
                        </div>
                      </div>
                    )}

                    {selectedNode.data.nodeType === 'action_custom_prompt' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Instrução Secreta</label>
                        <Textarea 
                          placeholder="Foque em..." 
                          className="resize-none h-32 bg-background/50"
                          value={(selectedNode.data.config as any)?.prompt_override || ''}
                          onChange={(e) => updateNodeData('prompt_override', e.target.value)}
                        />
                      </div>
                    )}

                    {selectedNode.data.nodeType === 'action_escalate' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Mensagem ao Cliente</label>
                          <Textarea 
                            placeholder="Ex: Aguarde um momento, um consultor vai te atender." 
                            className="resize-none h-20 bg-background/50"
                            value={(selectedNode.data.config as any)?.client_message || ''}
                            onChange={(e) => updateNodeData('client_message', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Alerta Interno (Humano)</label>
                          <Textarea 
                            placeholder="Ex: O cliente solicitou ajuda humana." 
                            className="resize-none h-20 bg-background/50"
                            value={(selectedNode.data.config as any)?.internal_alert || ''}
                            onChange={(e) => updateNodeData('internal_alert', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Telefone de Destino</label>
                          <Input 
                            placeholder="+5511999999999" 
                            className="bg-background/50"
                            value={(selectedNode.data.config as any)?.human_phone || ''}
                            onChange={(e) => updateNodeData('human_phone', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Pausa da IA (Horas)</label>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            value={(selectedNode.data.config as any)?.pause_duration || '24'}
                            onChange={(e) => updateNodeData('pause_duration', e.target.value)}
                          >
                            <option value="1">1 hora</option>
                            <option value="12">12 horas</option>
                            <option value="24">24 horas</option>
                            <option value="48">48 horas</option>
                            <option value="0">Permanente (manual)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {!['action_move_deal', 'action_close_deal', 'action_custom_prompt'].includes(selectedNode.data.nodeType) && (
                      <div className="p-3 bg-muted/20 rounded-lg border border-border/50 flex items-center justify-between">
                        <span className="text-sm text-foreground">Execução Automática</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="mt-6 space-y-2 border-t border-border/30 pt-4 shrink-0">
                <Button className="w-full text-destructive bg-destructive/10 hover:bg-destructive/20 border-destructive/20" variant="outline" onClick={handleDeleteNode}>
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir Bloco
                </Button>
                <Button className="w-full" variant="secondary" onClick={() => setSelectedNode(null)}>Fechar</Button>
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
