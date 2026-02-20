import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, Plus, Link2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortalRequestRow } from './RequestsList';

const statusOptions = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_atendimento', label: 'Em Atendimento' },
  { value: 'concluido', label: 'Concluído' },
];

const statusColors: Record<string, string> = {
  pendente: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  em_atendimento: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  concluido: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
};

const typeLabels: Record<string, string> = {
  cotacao: 'Cotação',
  endosso: 'Endosso',
  sinistro: 'Sinistro',
  renovacao: 'Renovação',
};

const ramoLabels: Record<string, string> = {
  auto: 'Auto',
  saude: 'Saúde',
  residencial: 'Residencial',
  empresarial: 'Empresarial',
  viagem: 'Viagem',
  smartphone: 'Smartphone',
  vida: 'Vida',
};

interface RequestDetailsSheetProps {
  request: PortalRequestRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: () => void;
}

export function RequestDetailsSheet({
  request,
  open,
  onOpenChange,
  onStatusUpdated,
}: RequestDetailsSheetProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);

  if (!request) return null;

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    const { error } = await (supabase as any)
      .from('portal_requests')
      .update({ status: newStatus })
      .eq('id', request.id);
    setIsUpdating(false);

    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status atualizado' });
      onStatusUpdated();
    }
  };

  const handleArchive = async () => {
    await handleStatusChange('concluido');
    onOpenChange(false);
  };

  const handleCreateDeal = () => {
    toast({ title: 'Em breve', description: 'A criação de oportunidade será implementada em breve.' });
  };

  const hasCustomFields = request.custom_fields && Object.keys(request.custom_fields).length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <SheetTitle className="text-lg">
                {request.clientes?.name || 'Cliente desconhecido'}
              </SheetTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {typeLabels[request.request_type] || request.request_type}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {ramoLabels[request.insurance_type] || request.insurance_type}
                </Badge>
              </div>
            </div>
            <Select
              value={request.status}
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger className={cn('w-[160px] h-8 text-xs', statusColors[request.status])}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {request.clientes?.phone && (
            <p className="text-xs text-muted-foreground">
              {request.clientes.phone}
              {request.clientes.email ? ` · ${request.clientes.email}` : ''}
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Relatório QAR
              </h4>
              <div className="rounded-lg bg-muted/30 border border-border/30 p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-auto">
                {request.qar_report || 'Nenhum relatório disponível.'}
              </div>
            </div>

            {hasCustomFields && (
              <Collapsible open={jsonOpen} onOpenChange={setJsonOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className={cn('w-3 h-3 transition-transform', jsonOpen && 'rotate-180')} />
                  Ver dados brutos (JSON)
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 rounded-lg bg-muted/30 border border-border/30 p-3 text-xs overflow-auto max-h-60">
                    {JSON.stringify(request.custom_fields, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/50 flex items-center gap-2">
          <Button onClick={handleCreateDeal} className="flex-1 gap-2">
            <Plus className="w-4 h-4" />
            Criar Oportunidade
          </Button>
          <Button variant="outline" onClick={() => toast({ title: 'Em breve', description: 'Vincular a oportunidade existente.' })} className="gap-2">
            <Link2 className="w-4 h-4" />
            Vincular
          </Button>
          <Button variant="ghost" onClick={handleArchive} className="gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4" />
            Arquivar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
