import { useMemo, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useCRMStages, useCRMDeals, CRMStage, CRMDeal } from '@/hooks/useCRMDeals';
import { useAuth } from '@/hooks/useAuth';
import { KanbanColumn } from './KanbanColumn';
import { DealCard } from './DealCard';
import { DealDetailsModal } from './DealDetailsModal';
import { NewDealModal } from './NewDealModal';
import { NewStageModal } from './NewStageModal';
import { StageEditModal } from './StageEditModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, Sparkles, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface KanbanBoardProps {
  pipelineId: string | null;
}

export function KanbanBoard({ pipelineId }: KanbanBoardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { stages, isLoading: stagesLoading, initializeStages, reorderStages, deleteStage } = useCRMStages(pipelineId);
  const { deals, isLoading: dealsLoading, moveDeal } = useCRMDeals(pipelineId);
  
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'deal' | 'column' | null>(null);
  
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<CRMDeal | null>(null);
  
  const [showNewStageModal, setShowNewStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<CRMStage | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Identify won/lost stage IDs
  const wonStageIds = useMemo(() => 
    stages.filter(s => s.chatwoot_label?.toLowerCase().includes('ganho')).map(s => s.id),
    [stages]
  );
  const lostStageIds = useMemo(() => 
    stages.filter(s => s.chatwoot_label?.toLowerCase().includes('perdido')).map(s => s.id),
    [stages]
  );

  // Filter deals
  const filteredDeals = useMemo(() => {
    let result = deals;

    if (statusFilter === 'won') {
      result = result.filter(d => wonStageIds.includes(d.stage_id));
    } else if (statusFilter === 'lost') {
      result = result.filter(d => lostStageIds.includes(d.stage_id));
    } else if (statusFilter === 'open') {
      result = result.filter(d => !wonStageIds.includes(d.stage_id) && !lostStageIds.includes(d.stage_id));
    }

    if (dateFrom) {
      result = result.filter(d => {
        const date = d.expected_close_date || d.created_at?.split('T')[0];
        return date && date >= dateFrom;
      });
    }
    if (dateTo) {
      result = result.filter(d => {
        const date = d.expected_close_date || d.created_at?.split('T')[0];
        return date && date <= dateTo;
      });
    }

    return result;
  }, [deals, statusFilter, dateFrom, dateTo, wonStageIds, lostStageIds]);

  const dealsByStage = useMemo(() => {
    const grouped: Record<string, CRMDeal[]> = {};
    stages.forEach((stage) => {
      grouped[stage.id] = filteredDeals
        .filter((deal) => deal.stage_id === stage.id)
        .sort((a, b) => a.position - b.position);
    });
    return grouped;
  }, [filteredDeals, stages]);

  const activeDeal = useMemo(() => {
    if (!activeId || activeType !== 'deal') return null;
    return deals.find((deal) => deal.id === activeId);
  }, [activeId, activeType, deals]);

  const activeStage = useMemo(() => {
    if (!activeId || activeType !== 'column') return null;
    const stageId = activeId.replace('column-', '');
    return stages.find((stage) => stage.id === stageId);
  }, [activeId, activeType, stages]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;
    
    if (id.startsWith('column-')) {
      setActiveType('column');
      setActiveId(id);
    } else {
      setActiveType('deal');
      setActiveId(id);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const isActiveDeal = !activeId.startsWith('column-');
    const isOverDeal = !overId.startsWith('column-');
    const isOverColumn = overId.startsWith('column-');

    if (!isActiveDeal) return;

    // Dropping a deal over another deal
    if (isActiveDeal && isOverDeal) {
      const activeDeal = deals.find(d => d.id === activeId);
      const overDeal = deals.find(d => d.id === overId);

      if (!activeDeal || !overDeal) return;

      if (activeDeal.stage_id !== overDeal.stage_id) {
        // Optimistic update for cross-column drag over
        const stageIds = stages.map(s => s.id);
        const queryKey = ['crm-deals', user?.id, pipelineId, stageIds];
        
        queryClient.setQueryData<CRMDeal[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map(d =>
            d.id === activeId
              ? { ...d, stage_id: overDeal.stage_id }
              : d
          );
        });
      }
    }

    // Dropping a deal over an empty column
    if (isActiveDeal && isOverColumn) {
      const activeDeal = deals.find(d => d.id === activeId);
      const overStageId = overId.replace('column-', '');

      if (!activeDeal) return;

      if (activeDeal.stage_id !== overStageId) {
        // Optimistic update for empty column drag over
        const stageIds = stages.map(s => s.id);
        const queryKey = ['crm-deals', user?.id, pipelineId, stageIds];
        
        queryClient.setQueryData<CRMDeal[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map(d =>
            d.id === activeId
              ? { ...d, stage_id: overStageId }
              : d
          );
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Handle column reordering
    if (activeIdStr.startsWith('column-') && overIdStr.startsWith('column-')) {
      const activeStageId = activeIdStr.replace('column-', '');
      const overStageId = overIdStr.replace('column-', '');
      
      if (activeStageId !== overStageId) {
        const oldIndex = stages.findIndex(s => s.id === activeStageId);
        const newIndex = stages.findIndex(s => s.id === overStageId);
        
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(stages, oldIndex, newIndex);
          reorderStages.mutate(newOrder.map(s => s.id));
        }
      }
      
      setActiveId(null);
      setActiveType(null);
      return;
    }

    // Handle deal movement
    if (!activeIdStr.startsWith('column-')) {
      const dealId = activeIdStr;
      let targetStageId = overIdStr;
      
      if (!overIdStr.startsWith('column-')) {
        const overDeal = deals.find((d) => d.id === overIdStr);
        if (overDeal) {
          targetStageId = overDeal.stage_id;
        }
      } else {
        targetStageId = overIdStr.replace('column-', '');
      }

      const targetStage = stages.find((s) => s.id === targetStageId);
      if (!targetStage) {
        setActiveId(null);
        setActiveType(null);
        return;
      }

      const deal = deals.find((d) => d.id === dealId);
      if (!deal) {
        setActiveId(null);
        setActiveType(null);
        return;
      }

      if (deal.stage_id === targetStageId) {
        setActiveId(null);
        setActiveType(null);
        return;
      }

      const dealsInTargetStage = dealsByStage[targetStageId] || [];
      const newPosition = dealsInTargetStage.length;

      // Optimistic update
      const stageIds = stages.map(s => s.id);
      const queryKey = ['crm-deals', user?.id, pipelineId, stageIds];
      const previousDeals = queryClient.getQueryData<CRMDeal[]>(queryKey);

      queryClient.setQueryData<CRMDeal[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map(d => 
          d.id === dealId 
            ? { ...d, stage_id: targetStageId, position: newPosition }
            : d
        );
      });

      try {
        await moveDeal.mutateAsync({ dealId, newStageId: targetStageId, newPosition });
        
        // Emit audit event for drag & drop stage change
        const oldStage = stages.find(s => s.id === deal.stage_id);
        const newStage = stages.find(s => s.id === targetStageId);
        await (supabase as any).from('crm_deal_events').insert({
          deal_id: dealId,
          event_type: 'stage_change',
          old_value: oldStage?.name || null,
          new_value: newStage?.name || null,
          source: 'manual',
          created_by: user?.id
        });
      } catch (error) {
        // Rollback
        if (previousDeals) {
          queryClient.setQueryData(queryKey, previousDeals);
        }
        toast.error('Erro ao mover negócio. Revertendo...');
      }
    }

    setActiveId(null);
    setActiveType(null);
  };

  const handleAddDeal = (stageId: string) => {
    setSelectedStageId(stageId);
    setShowNewDealModal(true);
  };

  const handleDealClick = (deal: CRMDeal) => {
    setSelectedDeal(deal);
  };

  const handleEditStage = (stage: CRMStage) => {
    setEditingStage(stage);
  };

  const handleDeleteStage = (stageId: string) => {
    deleteStage.mutate(stageId);
  };

  const handleInitializeStages = () => {
    if (pipelineId) {
      initializeStages.mutate(pipelineId);
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleDealStageChanged = useCallback((dealId: string, newStageId: string) => {
    // Auto-reset filter if it would hide the deal
    if (statusFilter === 'open') {
      setStatusFilter('all');
      toast.info('Filtro alterado para "Todos" para exibir o negócio movido.');
    }
    // Auto-scroll to target column
    setTimeout(() => {
      const targetCol = document.getElementById(`kanban-column-${newStageId}`);
      if (targetCol) {
        targetCol.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }, 300);
  }, [statusFilter]);

  const hasActiveFilters = statusFilter !== 'all' || dateFrom || dateTo;

  if (stagesLoading || dealsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pipelineId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 text-center"
      >
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Selecione um Funil
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Selecione ou crie um funil para começar a gerenciar seus negócios.
        </p>
      </motion.div>
    );
  }

  if (stages.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 text-center"
      >
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Configure seu Funil de Vendas
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          Crie as etapas do seu funil para começar a gerenciar seus negócios no Kanban.
        </p>
        <Button onClick={handleInitializeStages} disabled={initializeStages.isPending}>
          {initializeStages.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Criar Etapas Padrão
        </Button>
      </motion.div>
    );
  }

  return (
    <>
    <div className="h-full flex flex-col">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-secondary/20 border border-border/50 shrink-0">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="won">Ganhos</SelectItem>
            <SelectItem value="lost">Perdidos</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-[140px] h-8 text-xs"
          placeholder="De"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-[140px] h-8 text-xs"
          placeholder="Até"
        />
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => { setStatusFilter('all'); setDateFrom(''); setDateTo(''); }}
          >
            Limpar
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto no-scrollbar pb-4 flex-1 min-h-0">
          <SortableContext
            items={stages.map(s => `column-${s.id}`)}
            strategy={horizontalListSortingStrategy}
          >
            {stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id] || []}
                onAddDeal={() => handleAddDeal(stage.id)}
                onDealClick={handleDealClick}
                onEditStage={handleEditStage}
                onDeleteStage={handleDeleteStage}
              />
            ))}
          </SortableContext>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-shrink-0 w-80"
          >
            <Button
              variant="ghost"
              onClick={() => setShowNewStageModal(true)}
              className="
                h-24 w-full 
                border-2 border-dashed border-border/50
                hover:border-primary/50 hover:bg-primary/5
                rounded-xl
                flex flex-col items-center justify-center gap-2
                text-muted-foreground hover:text-foreground
                transition-all duration-200
              "
            >
              <Plus className="h-6 w-6" />
              <span>Nova Etapa</span>
            </Button>
          </motion.div>
        </div>

        <DragOverlay dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
        }}>
          {activeDeal && (
            <div className="w-80 cursor-grabbing" style={{ pointerEvents: 'none' }}>
              <DealCard 
                deal={activeDeal} 
                isDragging 
                stageColor={stages.find(s => s.id === activeDeal.stage_id)?.color}
              />
            </div>
          )}
          {activeStage && (
            <div className="w-80 cursor-grabbing" style={{ pointerEvents: 'none' }}>
              <div 
                className="glass-component rounded-xl p-4"
                style={{ borderTop: `3px solid ${activeStage.color}` }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: activeStage.color }}
                  />
                  <h3 className="font-semibold text-foreground">{activeStage.name}</h3>
                  <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-secondary/50 text-muted-foreground">
                    {dealsByStage[activeStage.id]?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>

      <NewDealModal
        open={showNewDealModal}
        onOpenChange={setShowNewDealModal}
        defaultStageId={selectedStageId}
      />

      <DealDetailsModal
        deal={selectedDeal}
        open={!!selectedDeal}
        onOpenChange={(open) => !open && setSelectedDeal(null)}
        onDealStageChanged={handleDealStageChanged}
      />

      <NewStageModal
        open={showNewStageModal}
        onOpenChange={setShowNewStageModal}
        pipelineId={pipelineId}
      />

      <StageEditModal
        stage={editingStage}
        open={!!editingStage}
        onOpenChange={(open) => !open && setEditingStage(null)}
      />
    </>
  );
}
