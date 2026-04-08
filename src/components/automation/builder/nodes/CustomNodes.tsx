import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Settings, GitBranch, MessageCircle, Bot } from 'lucide-react';

const nodeBaseClass = "rounded-lg p-3 shadow-lg border backdrop-blur-md min-w-[160px] text-sm";

export const TriggerNode = ({ data }: any) => {
  const audience = data.config?.target_audience || 'Todos';
  const stage = data.config?.stage_rule || 'Qualquer Etapa';

  return (
    <div className={`${nodeBaseClass} bg-primary/20 dark:bg-primary/30 border-primary/50 text-foreground font-semibold`}>
      <div className="flex items-center gap-2 mb-1">
        <Zap className="w-4 h-4 text-primary" />
        <span>{data.label}</span>
      </div>
      <div className="text-[10px] font-normal text-muted-foreground flex flex-col gap-0.5 mt-2">
        <span>👤 {audience}</span>
        <span>🎯 {stage}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-primary" />
    </div>
  );
};

export const ActionNode = ({ data }: any) => (
  <div className={`${nodeBaseClass} ${data.color || 'bg-card border-border'}`}>
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground" />
    <div className="flex items-center gap-2 mb-1">
      <Settings className="w-4 h-4 opacity-70" />
      <span className="font-medium text-foreground">{data.label}</span>
    </div>
    <div className="text-xs opacity-70 text-foreground truncate max-w-[140px]">
      Ação da IA
    </div>
    {/* Sucesso / Continuação */}
    <Handle type="source" position={Position.Bottom} id="success" className="w-3 h-3 bg-green-500" />
    {/* Erro / Falha (Fallback) */}
    <Handle type="source" position={Position.Right} id="error" className="w-3 h-3 bg-red-500" />
  </div>
);

export const DecisionNode = ({ data }: any) => (
  <div className={`${nodeBaseClass} ${data.color || 'bg-yellow-500/10 border-yellow-500/30'}`}>
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground" />
    <div className="flex items-center gap-2 mb-1">
      <GitBranch className="w-4 h-4 opacity-70" />
      <span className="font-medium text-foreground">{data.label}</span>
    </div>
    <div className="text-xs opacity-70 text-foreground truncate max-w-[140px]">
      {data.config?.condition || 'Defina a condição...'}
    </div>
    {/* True */}
    <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%' }} className="w-3 h-3 bg-green-500" />
    {/* False */}
    <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%' }} className="w-3 h-3 bg-red-500" />
  </div>
);

export const MessageNode = ({ data }: any) => (
  <div className={`${nodeBaseClass} ${data.color || 'bg-cyan-500/10 border-cyan-500/30'}`}>
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground" />
    <div className="flex items-center gap-2 mb-1">
      <MessageCircle className="w-4 h-4 opacity-70" />
      <span className="font-medium text-foreground">{data.label}</span>
    </div>
    <div className="text-xs opacity-70 text-foreground truncate max-w-[140px]">
      {data.config?.message_template || 'Enviar mensagem...'}
    </div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-500" />
  </div>
);

export const customNodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  decision: DecisionNode,
  message: MessageNode,
};
