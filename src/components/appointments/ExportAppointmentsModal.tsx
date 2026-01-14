import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileText, CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { generateAppointmentsReport, AppointmentRow } from '@/utils/pdf/generateAppointmentsReport';

type PeriodType = 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'custom';
type StatusFilter = 'pending' | 'completed' | 'all';

interface ExportAppointmentsModalProps {
  disabled?: boolean;
}

export function ExportAppointmentsModal({ disabled }: ExportAppointmentsModalProps) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filtros
  const [periodType, setPeriodType] = useState<PeriodType>('today');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  
  // Opções de Layout
  const [groupByDay, setGroupByDay] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  
  // Customização
  const [title, setTitle] = useState('Agenda do Dia');
  const [notes, setNotes] = useState('');

  // Calcular período baseado no tipo selecionado
  const calculatedPeriod = useMemo(() => {
    const today = new Date();
    
    switch (periodType) {
      case 'today':
        return {
          from: startOfDay(today),
          to: endOfDay(today),
          label: 'Hoje'
        };
      case 'tomorrow':
        const tomorrow = addDays(today, 1);
        return {
          from: startOfDay(tomorrow),
          to: endOfDay(tomorrow),
          label: 'Amanhã'
        };
      case 'this_week':
        return {
          from: startOfWeek(today, { weekStartsOn: 1 }),
          to: endOfWeek(today, { weekStartsOn: 1 }),
          label: 'Esta Semana'
        };
      case 'next_week':
        const nextWeekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1);
        return {
          from: nextWeekStart,
          to: endOfWeek(nextWeekStart, { weekStartsOn: 1 }),
          label: 'Próxima Semana'
        };
      case 'custom':
        return {
          from: customDateFrom,
          to: customDateTo || customDateFrom,
          label: 'Período Personalizado'
        };
      default:
        return {
          from: startOfDay(today),
          to: endOfDay(today),
          label: 'Hoje'
        };
    }
  }, [periodType, customDateFrom, customDateTo]);

  // Reset form
  const resetForm = () => {
    setPeriodType('today');
    setCustomDateFrom(undefined);
    setCustomDateTo(undefined);
    setStatusFilter('pending');
    setGroupByDay(true);
    setShowNotes(true);
    setTitle('Agenda do Dia');
    setNotes('');
  };

  // Fetch e gerar relatório
  const handleGenerate = async () => {
    if (!calculatedPeriod.from) {
      toast.error('Selecione um período válido');
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Buscar agendamentos com joins
      let query = supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          title,
          status,
          notes,
          client_id,
          policy_id,
          clientes:client_id (
            name,
            phone,
            email
          ),
          apolices:policy_id (
            policy_number
          )
        `)
        .eq('user_id', user.id)
        .gte('date', format(calculatedPeriod.from, 'yyyy-MM-dd'))
        .lte('date', format(calculatedPeriod.to || calculatedPeriod.from, 'yyyy-MM-dd'))
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      // Filtro de status
      if (statusFilter === 'pending') {
        query = query.eq('status', 'Pendente');
      } else if (statusFilter === 'completed') {
        query = query.eq('status', 'Realizado');
      }

      const { data: appointments, error } = await query;

      if (error) throw error;

      if (!appointments || appointments.length === 0) {
        toast.warning('Nenhum agendamento encontrado para o período selecionado');
        setIsGenerating(false);
        return;
      }

      // Transformar dados para o formato do relatório
      const reportData: AppointmentRow[] = appointments.map(apt => ({
        id: apt.id,
        date: apt.date,
        time: apt.time,
        title: apt.title,
        status: apt.status,
        notes: apt.notes,
        clientName: (apt.clientes as any)?.name || null,
        clientPhone: (apt.clientes as any)?.phone || null,
        clientEmail: (apt.clientes as any)?.email || null,
        policyNumber: (apt.apolices as any)?.policy_number || null
      }));

      // Gerar PDF
      await generateAppointmentsReport({
        appointments: reportData,
        period: {
          from: calculatedPeriod.from,
          to: calculatedPeriod.to
        },
        options: {
          title,
          notes,
          groupByDay,
          showNotes,
          periodLabel: calculatedPeriod.label
        }
      });

      toast.success(`Relatório gerado com ${reportData.length} compromissos`);
      setOpen(false);
      resetForm();

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatPeriodDisplay = () => {
    if (!calculatedPeriod.from) return 'Selecione um período';
    
    if (periodType === 'custom') {
      if (customDateFrom && customDateTo) {
        return `${format(customDateFrom, 'dd/MM/yyyy')} a ${format(customDateTo, 'dd/MM/yyyy')}`;
      }
      return customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'Selecione as datas';
    }
    
    return `${format(calculatedPeriod.from, 'dd/MM')} a ${format(calculatedPeriod.to!, 'dd/MM/yyyy')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <FileText className="h-4 w-4" />
          Exportar PDF
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Exportar Agenda
          </DialogTitle>
          <DialogDescription>
            Gere uma folha de rosto com seus compromissos para controle diário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Período */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Período</Label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="tomorrow">Amanhã</SelectItem>
                <SelectItem value="this_week">Esta Semana</SelectItem>
                <SelectItem value="next_week">Próxima Semana</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Date pickers para período customizado */}
            {periodType === 'custom' && (
              <div className="flex gap-2 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !customDateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'Data inicial'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateFrom}
                      onSelect={setCustomDateFrom}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !customDateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'Data final'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDateTo}
                      onSelect={setCustomDateTo}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => customDateFrom ? date < customDateFrom : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">
              {formatPeriodDisplay()}
            </p>
          </div>

          {/* Filtro de Status */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Apenas Pendentes</SelectItem>
                <SelectItem value="completed">Apenas Realizados</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Opções de Layout */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Layout do Relatório</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="groupByDay"
                checked={groupByDay}
                onCheckedChange={(checked) => setGroupByDay(checked as boolean)}
              />
              <label htmlFor="groupByDay" className="text-sm cursor-pointer">
                Agrupar por dia (seções: Segunda, Terça...)
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showNotes"
                checked={showNotes}
                onCheckedChange={(checked) => setShowNotes(checked as boolean)}
              />
              <label htmlFor="showNotes" className="text-sm cursor-pointer">
                Mostrar notas/observações dos compromissos
              </label>
            </div>
          </div>

          {/* Título Customizado */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">Título do Relatório</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Agenda Semanal - Renovações"
              maxLength={50}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionais que aparecerão no rodapé do relatório..."
              rows={2}
              maxLength={200}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Gerar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
