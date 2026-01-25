import React from 'react';
import { GripVertical, Plus, Trash2, Settings, Sparkles, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Stage {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface AiSetting {
  stage_id: string;
  is_active: boolean;
}

interface PipelineStageSidebarProps {
  stages: Stage[];
  aiSettings: AiSetting[];
  stageConfigMap?: Map<string, boolean>;
  hasPipelineDefault?: boolean;
  selectedStageId: string | null;
  onSelectStage: (stageId: string) => void;
  onReorderStages: (stageIds: string[]) => void;
  onEditStage: (stage: Stage) => void;
  onDeleteStage: (stageId: string) => void;
  onAddStage: () => void;
  onToggleAI?: (stageId: string, isActive: boolean) => void;
}

interface SortableStageItemProps {
  stage: Stage;
  isSelected: boolean;
  isAiActive: boolean;
  hasCustomConfig: boolean;
  hasPipelineDefault: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAI?: (isActive: boolean) => void;
  isLast: boolean;
}

function SortableStageItem({
  stage,
  isSelected,
  isAiActive,
  hasCustomConfig,
  hasPipelineDefault,
  onSelect,
  onEdit,
  onDelete,
  onToggleAI,
  isLast,
}: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Determine inheritance badge
  const getInheritanceBadge = () => {
    if (hasCustomConfig) {
      return {
        label: 'DNA Próprio',
        icon: Sparkles,
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        tooltip: 'Esta etapa tem configuração customizada',
      };
    }
    if (hasPipelineDefault) {
      return {
        label: 'Herda',
        icon: GitBranch,
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        tooltip: 'Usando DNA padrão do funil',
      };
    }
    return {
      label: 'Padrão',
      icon: GitBranch,
      className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
      tooltip: 'Sem configuração definida',
    };
  };

  const inheritanceBadge = getInheritanceBadge();
  const InheritanceIcon = inheritanceBadge.icon;

  return (
    <div ref={setNodeRef} style={style}>
      {/* Stage Card */}
      <div
        className={cn(
          "bg-zinc-900/50 border rounded-lg p-3 transition-all duration-200",
          isSelected
            ? "border-zinc-600 bg-zinc-900"
            : "border-zinc-800 hover:border-zinc-700",
          isDragging && "opacity-50 shadow-lg"
        )}
      >
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Color Indicator */}
          <div
            className="w-2 h-8 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color }}
          />

          {/* Stage Info */}
          <button
            onClick={onSelect}
            className="flex-1 text-left min-w-0"
          >
            <div className="font-medium text-zinc-100 truncate">
              {stage.name}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {/* Inheritance Badge */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 border font-medium",
                        inheritanceBadge.className
                      )}
                    >
                      <InheritanceIcon className="h-2.5 w-2.5 mr-0.5" />
                      {inheritanceBadge.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-zinc-800 border-zinc-700 text-zinc-100 text-xs">
                    {inheritanceBadge.tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* AI Status Badge */}
              <Badge 
                className={cn(
                  "text-[10px] px-1.5 py-0 border-0",
                  isAiActive 
                    ? "bg-zinc-800 text-emerald-400" 
                    : "bg-zinc-800/50 text-zinc-500"
                )}
              >
                {isAiActive ? 'IA' : 'Manual'}
              </Badge>
            </div>
          </button>
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            {onToggleAI && (
              <>
                <Switch
                  checked={isAiActive}
                  onCheckedChange={onToggleAI}
                  className="data-[state=checked]:bg-zinc-600"
                />
                <span className="text-xs text-zinc-500">IA Ativa</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="h-7 px-2 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-7 px-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Connector Line */}
      {!isLast && (
        <div className="flex justify-center py-1">
          <div className="w-px h-4 bg-zinc-800" />
        </div>
      )}
    </div>
  );
}

export function PipelineStageSidebar({
  stages,
  aiSettings,
  stageConfigMap = new Map(),
  hasPipelineDefault = false,
  selectedStageId,
  onSelectStage,
  onReorderStages,
  onEditStage,
  onDeleteStage,
  onAddStage,
  onToggleAI,
}: PipelineStageSidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = stages.findIndex((s) => s.id === active.id);
      const newIndex = stages.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(stages, oldIndex, newIndex);
      onReorderStages(newOrder.map((s) => s.id));
    }
  };

  const sortedStages = [...stages].sort((a, b) => a.position - b.position);

  const getAiSetting = (stageId: string): boolean => {
    const setting = aiSettings.find((s) => s.stage_id === stageId);
    return setting?.is_active ?? false;
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950/50 backdrop-blur-md border border-zinc-800 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h3 className="font-medium text-zinc-100">Etapas do Funil</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddStage}
          className="h-8 px-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nova
        </Button>
      </div>

      {/* Stage List */}
      <ScrollArea className="flex-1 p-4">
        {sortedStages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-500 mb-4">
              Nenhuma etapa configurada
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddStage}
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira etapa
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedStages.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-0">
                {sortedStages.map((stage, index) => (
                  <SortableStageItem
                    key={stage.id}
                    stage={stage}
                    isSelected={selectedStageId === stage.id}
                    isAiActive={getAiSetting(stage.id)}
                    hasCustomConfig={stageConfigMap.get(stage.id) ?? false}
                    hasPipelineDefault={hasPipelineDefault}
                    onSelect={() => onSelectStage(stage.id)}
                    onEdit={() => onEditStage(stage)}
                    onDelete={() => onDeleteStage(stage.id)}
                    onToggleAI={onToggleAI ? (isActive) => onToggleAI(stage.id, isActive) : undefined}
                    isLast={index === sortedStages.length - 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>
    </div>
  );
}
