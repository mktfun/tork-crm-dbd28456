import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, Zap, Sparkles, RotateCcw, ChevronDown, ChevronUp, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VibeSelector, VibeId, VIBE_CONFIG } from './VibeSelector';
import { AI_PERSONA_PRESETS } from './aiPresets';
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
  follow_up_enabled?: boolean | null;
  follow_up_interval_minutes?: number | null;
  follow_up_max_attempts?: number | null;
  follow_up_message?: string | null;
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

// Deterministic vibe inference via exact xmlPrompt match
function inferVibeFromPersona(persona: string | null | undefined): VibeId | null {
  if (!persona) return null;
  // Match direto por ID curto (novo formato)
  const validIds: VibeId[] = ['proactive', 'technical', 'supportive_sales', 'supportive'];
  if (validIds.includes(persona as VibeId)) return persona as VibeId;
  // Fallback: match por xmlPrompt (dados legados)
  const match = AI_PERSONA_PRESETS.find(p => p.xmlPrompt === persona);
  if (match && match.id in VIBE_CONFIG) return match.id as VibeId;
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
  const userSelectedRef = useRef(false);
  const missionFocusedRef = useRef(false);
  
  // Sync expanded state with selection
  useEffect(() => {
    if (isSelected) setIsExpanded(true);
  }, [isSelected]);
  
  // Sync mission with external data — skip if user is typing
  useEffect(() => {
    if (!missionFocusedRef.current) {
      setMission(currentObjective || '');
    }
  }, [currentObjective]);
  
  // Sync vibe with external data — skip when change came from user click
  useEffect(() => {
    if (userSelectedRef.current) {
      userSelectedRef.current = false;
      return;
    }
    const inferred = inferVibeFromPersona(currentPersona);
    setSelectedVibe(prev => prev === inferred ? prev : inferred);
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
    userSelectedRef.current = true;
    setSelectedVibe(vibeId);
    onSaveConfig({
      stage_id: stage.id,
      ai_persona: vibeId,
    });
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
        'bg-card border-border',
        isSelected 
          ? 'border-primary/40 ring-1 ring-primary/20' 
          : 'hover:border-muted-foreground/30',
        isActive 
          ? 'shadow-sm' 
          : ''
      )}
    >
      
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
              'text-xs font-medium w-10 text-center',
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
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Vibe do agente
            </label>
            <VibeSelector
              value={selectedVibe}
              onChange={handleVibeChange}
              disabled={isSaving}
            />
          </div>
          
          {/* Mission */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Missão principal
            </label>
            <Textarea
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              onFocus={() => { missionFocusedRef.current = true; }}
              onBlur={() => { missionFocusedRef.current = false; }}
              placeholder="Ex: Descobrir CNPJ e quantidade de vidas"
              className="min-h-[60px] bg-secondary/50 border-border/50 text-sm resize-none"
              disabled={isSaving}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Salva automaticamente • Variáveis: {'{{deal_title}}'}, {'{{pipeline_name}}'}
            </p>
          </div>

          {/* Follow-up Section */}
          <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                Follow-up automático
              </label>
              <Switch
                checked={aiSetting?.follow_up_enabled ?? false}
                onCheckedChange={(checked) => onSaveConfig({
                  stage_id: stage.id,
                  follow_up_enabled: checked,
                })}
                disabled={isSaving}
                className="data-[state=checked]:bg-amber-500 scale-90"
              />
            </div>
            {aiSetting?.follow_up_enabled && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">Intervalo (min)</label>
                    <Input
                      type="number"
                      min={5}
                      value={aiSetting?.follow_up_interval_minutes ?? 60}
                      onChange={(e) => onSaveConfig({
                        stage_id: stage.id,
                        follow_up_interval_minutes: parseInt(e.target.value) || 60,
                      })}
                      className="h-7 text-xs bg-background/50"
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Max tentativas</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={aiSetting?.follow_up_max_attempts ?? 3}
                      onChange={(e) => onSaveConfig({
                        stage_id: stage.id,
                        follow_up_max_attempts: parseInt(e.target.value) || 3,
                      })}
                      className="h-7 text-xs bg-background/50"
                      disabled={isSaving}
                    />
                  </div>
                </div>
                <Textarea
                  value={aiSetting?.follow_up_message ?? ''}
                  onChange={(e) => onSaveConfig({
                    stage_id: stage.id,
                    follow_up_message: e.target.value,
                  })}
                  placeholder="Mensagem personalizada (opcional). Padrão: templates automáticos."
                  className="min-h-[40px] text-xs bg-background/50 border-border/50 resize-none"
                  disabled={isSaving}
                />
              </div>
            )}
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
