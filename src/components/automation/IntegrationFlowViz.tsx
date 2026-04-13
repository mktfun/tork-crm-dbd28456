import React from 'react';
import { MessageSquare, Tag, Bot, Target, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntegrationFlowVizProps {
  chatwootLabel?: string | null;
  aiName?: string;
  objective?: string;
  isAiActive: boolean;
  className?: string;
}

export function IntegrationFlowViz({
  chatwootLabel,
  aiName = 'Agente IA',
  objective,
  isAiActive,
  className,
}: IntegrationFlowVizProps) {
  const steps = [
    {
      icon: MessageSquare,
      label: 'WhatsApp',
      sublabel: 'Mensagem',
      active: true,
    },
    {
      icon: Tag,
      label: 'Etiqueta',
      sublabel: chatwootLabel || 'Sem label',
      active: !!chatwootLabel,
    },
    {
      icon: Bot,
      label: aiName,
      sublabel: isAiActive ? 'IA Ativa' : 'Manual',
      active: isAiActive,
      highlight: isAiActive,
    },
    {
      icon: Target,
      label: 'Missão',
      sublabel: objective ? objective.slice(0, 20) + (objective.length > 20 ? '...' : '') : 'Não definida',
      active: !!objective,
    },
  ];

  return (
    <div className={cn('flex items-end justify-between gap-1 pb-1', className)}>
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          {/* Step node */}
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
                step.highlight
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : step.active
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary text-muted-foreground'
              )}
            >
              <step.icon className="h-4 w-4" />
            </div>
            <div className="text-center">
              <p className={cn(
                'text-[10px] font-medium leading-tight',
                step.active ? 'text-foreground' : 'text-muted-foreground'
              )}>
                {step.label}
              </p>
              <p className="text-[9px] text-muted-foreground truncate max-w-[60px]">
                {step.sublabel}
              </p>
            </div>
          </div>
          
          {/* Arrow connector */}
          {index < steps.length - 1 && (
            <ArrowRight className={cn(
              'h-3 w-3 shrink-0 mb-5',
              step.active ? 'text-primary/50' : 'text-border'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
