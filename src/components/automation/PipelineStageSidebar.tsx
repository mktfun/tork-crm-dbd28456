import React from 'react';
import { Bot, GripVertical, Pencil, Plus, Trash2, Zap, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  selectedStageId: string | null;
  onSelectStage: (stageId: string) => void;
  onReorderStages: (stageIds: string[]) => void;
  onEditStage: (stage: Stage) => void;
  onDeleteStage: (stageId: string) => void;
  onAddStage: () => void;
}

interface SortableStageItemProps {
  stage: Stage;
  isSelected: boolean;
  isAiActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableStageItem({
  stage,
  isSelected,
  isAiActive,
  onSelect,
  onEdit,
  onDelete,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "z-50"
      )}
    >
      {/* Connector Line - simplified */}
      <div className="absolute left-5 top-full w-px h-3 bg-zinc-800" />
      
      <div
        className={cn(
          "relative flex items-center gap-2 p-2.5 rounded-lg border transition-all duration-150 cursor-pointer",
          isSelected
            ? "border-primary/50 bg-primary/5"
            : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900",
          isDragging && "opacity-50"
        )}
        onClick={onSelect}
      >
        {/* Drag Handle */}
        <button
          className="p-1 rounded hover:bg-muted/50 cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Color Indicator */}
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: stage.color }}
        />

        {/* Stage Name */}
        <span className="flex-1 font-medium text-sm text-foreground truncate">
          {stage.name}
        </span>

        {/* AI Status Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={isAiActive ? "default" : "secondary"}
              className={cn(
                "gap-1 text-xs px-2 py-0.5",
                isAiActive 
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isAiActive ? (
                <>
                  <Zap className="h-3 w-3" />
                  IA
                </>
              ) : (
                <>
                  <Hand className="h-3 w-3" />
                  Manual
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {isAiActive 
              ? "Agente de IA ativo nesta etapa" 
              : "Atendimento manual nesta etapa"
            }
          </TooltipContent>
        </Tooltip>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar etapa</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir etapa</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export function PipelineStageSidebar({
  stages,
  aiSettings,
  selectedStageId,
  onSelectStage,
  onReorderStages,
  onEditStage,
  onDeleteStage,
  onAddStage,
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-foreground">Etapas</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddStage}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Stages List */}
      <ScrollArea className="flex-1 p-3">
        {sortedStages.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-xs">Nenhuma etapa</p>
            <Button variant="link" size="sm" onClick={onAddStage} className="mt-1 text-xs">
              Criar etapa
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
              <div className="space-y-1.5">
                {sortedStages.map((stage) => {
                  const aiSetting = aiSettings.find((s) => s.stage_id === stage.id);
                  const isAiActive = aiSetting?.is_active ?? false;

                  return (
                    <SortableStageItem
                      key={stage.id}
                      stage={stage}
                      isSelected={selectedStageId === stage.id}
                      isAiActive={isAiActive}
                      onSelect={() => onSelectStage(stage.id)}
                      onEdit={() => onEditStage(stage)}
                      onDelete={() => onDeleteStage(stage.id)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>
    </div>
  );
}
