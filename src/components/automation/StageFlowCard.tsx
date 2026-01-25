import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Zap, Sparkles, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VibeSelector, VibeId, getVibePreset, VIBE_CONFIG } from './VibeSelector';
import { ConfigSourceBadge } from './ConfigSourceBadge';
import { useDebounce } from '@/hooks/useDebounce';

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
  chatwoot_label?: string | null;
}

interface AiSetting {
  id?: string;
  stage_id: string;
  ai_name?: string | null;
  ai_persona?: string | null;
  ai_objective?: string | null;
  ai_custom_rules?: string | null;
  is_active?: boolean | null;
  max_messages_before_human?: number | null;
}

interface StageFlowCardProps {
  stage: Stage;
  aiSetting: AiSetting | null;
  pipelineDefault: {
    ai_persona?: string | null;
    ai_objective?: string | null;
    is_active?: boolean | null;
  } | null;
  isSelected: boolean;
  hasCustomConfig: boolean;
  onSelect: () => void;
  onToggleAI: (stageId: string, isActive: boolean) => void;
  onSaveConfig: (data: Partial<AiSetting>) => void;
  onResetToDefault: (stageId: string) => void;
  isSaving?: boolean;
}

// Infer vibe from persona XML
function inferVibeFromPersona(persona: string | null | undefined): VibeId | null {
  if (!persona) return null;
  
  if (persona.includes('SDR') || persona.includes('CNPJ') || persona.includes('ping-pong') || persona.includes('fechar')) {
    return 'proactive';
  }
  if (persona.includes('técnico') || persona.includes('especialista') || persona.includes('diagnóstico')) {
    return 'technical';
  }
  if (persona.includes('resolvedor') || persona.includes('acolhimento') || persona.includes('suporte')) {
    return 'supportive';
  }
  
  return null;
}

export function StageFlowCard({
  stage,
  aiSetting,
  pipelineDefault,
  isSelected,
  hasCustomConfig,
  onSelect,
  onToggleAI,
  onSaveConfig,
  onResetToDefault,
  isSaving,
}: StageFlowCardProps) {
  const isActive = aiSetting?.is_active ?? pipelineDefault?.is_active ?? false;
  const currentPersona = aiSetting?.ai_persona ?? pipelineDefault?.ai_persona ?? null;
  const currentObjective = aiSetting?.ai_objective ?? pipelineDefault?.ai_objective ?? '';
  
  const [isExpanded, setIsExpanded] = useState(isSelected);
  const [selectedVibe, setSelectedVibe] = useState<VibeId | null>(inferVibeFromPersona(currentPersona));
  const [mission, setMission] = useState(currentObjective || '');
  const debouncedMission = useDebounce(mission, 1500);
  
  // Sync expanded state with selection
  useEffect(() => {
    if (isSelected) setIsExpanded(true);
  }, [isSelected]);
  
  // Sync mission with external data
  useEffect(() => {
    setMission(currentObjective || '');
  }, [currentObjective]);
  
  // Sync vibe with external data
  useEffect(() => {
    setSelectedVibe(inferVibeFromPersona(currentPersona));
  }, [currentPersona]);
  
  // Auto-save mission on debounce
  useEffect(() => {
    if (debouncedMission && debouncedMission !== currentObjective) {
      onSaveConfig({
        stage_id: stage.id,
        ai_objective: debouncedMission,
      });
    }
  }, [debouncedMission]);
  
  const handleVibeChange = useCallback((vibeId: VibeId) => {
    setSelectedVibe(vibeId);
    const preset = getVibePreset(vibeId);
    if (preset) {
      onSaveConfig({
        stage_id: stage.id,
        ai_persona: preset.xmlPrompt,
      });
    }
  }, [stage.id, onSaveConfig]);
  
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) onSelect();
  };

  const configSource = hasCustomConfig ? 'stage' : pipelineDefault ? 'pipeline' : 'default';
  
  return (
    <div
      className={cn(
        'relative rounded-xl border transition-all duration-200',
        'bg-card/50 backdrop-blur-sm',
        isSelected 
          ? 'border-primary/40 ring-1 ring-primary/20' 
          : 'border-border hover:border-muted-foreground/30',
        isActive 
          ? 'shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
          : ''
      )}
    >
      {/* Connecting line to next stage */}
      <div className="absolute left-6 -bottom-4 w-px h-4 bg-border" />
      
      {/* Stage color indicator */}
      <div 
        className="absolute left-0 top-4 bottom-4 w-1 rounded-full"
        style={{ backgroundColor: stage.color }}
      />
      
      {/* Header - Always visible */}
      <div 
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={handleToggleExpand}
      >
        {/* Stage indicator */}
        <div 
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg shrink-0',
            isActive ? 'bg-emerald-500/20' : 'bg-secondary'
          )}
        >
          {isActive ? (
            <Bot className="h-4 w-4 text-emerald-400" />
          ) : (
            <Zap className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        
        {/* Title and badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-foreground truncate">
              {stage.name}
            </h3>
            {stage.chatwoot_label && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                {stage.chatwoot_label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {selectedVibe && (
              <span className="text-xs text-muted-foreground">
                {VIBE_CONFIG[selectedVibe].shortName}
              </span>
            )}
            {mission && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                • {mission}
              </span>
            )}
          </div>
        </div>
        
        {/* Status and toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <ConfigSourceBadge source={configSource} />
          
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs font-medium',
              isActive ? 'text-emerald-400' : 'text-muted-foreground'
            )}>
              {isActive ? 'IA' : 'Manual'}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={(checked) => onToggleAI(stage.id, checked)}
              className="data-[state=checked]:bg-emerald-500"
            />
          </div>
          
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border/50">
          {/* Vibe Selector */}
          <div className="pt-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Vibe do Agente
            </label>
            <VibeSelector
              value={selectedVibe}
              onChange={handleVibeChange}
              disabled={isSaving}
            />
          </div>
          
          {/* Mission */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Missão Principal
            </label>
            <Textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              placeholder="Ex: Descobrir CNPJ e quantidade de vidas"
              className="min-h-[60px] bg-secondary/50 border-border/50 text-sm resize-none"
              disabled={isSaving}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Salva automaticamente • Variáveis: {'{{deal_title}}'}, {'{{pipeline_name}}'}
            </p>
          </div>
          
          {/* Actions */}
          {hasCustomConfig && (
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onResetToDefault(stage.id)}
                disabled={isSaving}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Resetar para Padrão
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
