import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { useClients, usePolicies } from '@/hooks/useAppData';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useCompanyNames } from '@/hooks/useCompanyNames';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, Flag, Repeat, User, FileText } from 'lucide-react';
import RecurrenceConfig from './RecurrenceConfig';

interface AppointmentModalProps {
  initialDate?: Date;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerButton?: React.ReactNode;
}

export function AppointmentModal({
  initialDate,
  isOpen,
  onOpenChange,
  triggerButton
}: AppointmentModalProps) {
  const [open, setOpen] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientId: '',
    policyId: '',
    title: '',
    date: '',
    time: '',
    notes: '',
    priority: 'Normal'
  });

  const { addAppointment, isAdding } = useSupabaseAppointments();
  const { clients } = useClients();
  const { policies } = usePolicies();
  const { getCompanyName, loading: companiesLoading } = useCompanyNames();
  const { toast } = useToast();

  const modalOpen = isOpen !== undefined ? isOpen : open;
  const setModalOpen = onOpenChange || setOpen;

  useEffect(() => {
    if (initialDate) {
      const formattedDate = initialDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, date: formattedDate }));
    }
  }, [initialDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date.trim() || !formData.time.trim()) {
      toast({ title: "Erro", description: "Título, data e horário são obrigatórios", variant: "destructive" });
      return;
    }

    try {
      const startTimestamp = recurrenceRule
        ? new Date(`${formData.date}T${formData.time}:00`).toISOString()
        : null;

      await addAppointment({
        client_id: formData.clientId === 'none' || !formData.clientId ? null : formData.clientId,
        policy_id: formData.policyId === 'none' || !formData.policyId ? null : formData.policyId,
        title: formData.title.trim(),
        date: formData.date,
        time: formData.time,
        status: 'Pendente',
        notes: formData.notes.trim() || undefined,
        priority: formData.priority,
        recurrence_rule: recurrenceRule,
        original_start_timestamptz: startTimestamp
      });

      toast({ title: "Sucesso", description: "Agendamento criado com sucesso!" });

      setFormData({ clientId: '', policyId: '', title: '', date: '', time: '', notes: '', priority: 'Normal' });
      setRecurrenceRule(null);
      setModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({ title: "Erro", description: "Falha ao criar agendamento. Tente novamente.", variant: "destructive" });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const clientOptions = [
    { value: 'none', label: 'Nenhum cliente específico' },
    ...clients.map(client => ({
      value: client.id,
      label: `${client.name} - ${client.phone || client.email || 'Sem contato'}`
    }))
  ];

  const selectedClientPolicies = formData.clientId && formData.clientId !== 'none'
    ? policies.filter(p => p.clientId === formData.clientId)
    : policies;

  const policyOptions = [
    { value: 'none', label: 'Nenhuma apólice específica' },
    ...selectedClientPolicies.map(policy => ({
      value: policy.id,
      label: `${policy.ramos?.nome || policy.type || 'Sem tipo'} - ${policy.companies?.name || 'Seguradora'} ${policy.policyNumber ? `(${policy.policyNumber})` : ''}`
    }))
  ];

  const modalContent = (
    <DialogContent className="sm:max-w-xl bg-background/95 backdrop-blur-3xl border border-border/30 shadow-[0_30px_60px_rgba(0,0,0,0.4)] sm:rounded-[2rem] p-0 overflow-hidden gap-0">
      <form onSubmit={handleSubmit} className="flex flex-col">
        {/* ── Header: Ambientação de Evento ── */}
        <div className="p-6 bg-muted/20 border-b border-border/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner shrink-0">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {initialDate
                  ? `Agendar para ${initialDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`
                  : 'Novo Agendamento'}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">Configure os detalhes do evento</p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Campo Rei: Título */}
          <Input
            value={formData.title}
            onChange={e => handleInputChange('title', e.target.value)}
            placeholder="Do que se trata este agendamento?"
            className="w-full text-xl font-semibold bg-transparent border-0 border-b-2 border-transparent hover:border-muted focus-visible:border-primary focus-visible:ring-0 rounded-none px-1 py-4 shadow-none placeholder:text-muted-foreground/40 transition-all h-auto"
          />

          {/* ── Ilha de Metadados (iOS Settings List) ── */}
          <div className="bg-card/50 rounded-2xl border border-border/10 divide-y divide-border/10 overflow-hidden">
            {/* Data */}
            <div className="flex items-center justify-between px-4 py-3 hover:bg-accent/5 transition-colors">
              <span className="flex items-center gap-2.5 text-sm text-foreground/80">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Data
              </span>
              <Input
                type="date"
                value={formData.date}
                onChange={e => handleInputChange('date', e.target.value)}
                className="w-[160px] border-0 bg-transparent text-right focus-visible:ring-0 shadow-none text-muted-foreground font-mono text-sm h-auto py-0 px-0"
              />
            </div>

            {/* Hora */}
            <div className="flex items-center justify-between px-4 py-3 hover:bg-accent/5 transition-colors">
              <span className="flex items-center gap-2.5 text-sm text-foreground/80">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Horário
              </span>
              <Input
                type="time"
                value={formData.time}
                onChange={e => handleInputChange('time', e.target.value)}
                className="w-[120px] border-0 bg-transparent text-right focus-visible:ring-0 shadow-none text-muted-foreground font-mono text-sm h-auto py-0 px-0"
              />
            </div>

            {/* Prioridade */}
            <div className="flex items-center justify-between px-4 py-3 hover:bg-accent/5 transition-colors">
              <span className="flex items-center gap-2.5 text-sm text-foreground/80">
                <Flag className="w-4 h-4 text-muted-foreground" />
                Prioridade
              </span>
              <Select value={formData.priority} onValueChange={value => handleInputChange('priority', value)}>
                <SelectTrigger className="w-[130px] border-0 bg-transparent shadow-none focus:ring-0 text-right text-muted-foreground text-sm h-auto py-0 px-0 justify-end gap-1.5 [&>svg]:text-muted-foreground/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Recorrência */}
            <div className="px-4 py-3 hover:bg-accent/5 transition-colors">
              <RecurrenceConfig onRecurrenceChange={setRecurrenceRule} inline />
            </div>
          </div>

          {/* ── Ilha de Associações (Cliente & Apólice) ── */}
          <div className="bg-card/50 rounded-2xl border border-border/10 divide-y divide-border/10 overflow-hidden">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm text-foreground/80 mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Cliente
              </div>
              <Combobox
                options={clientOptions}
                value={formData.clientId}
                onValueChange={value => handleInputChange('clientId', value)}
                placeholder="Associar a um cliente (opcional)"
                searchPlaceholder="Buscar cliente por nome, telefone ou email..."
                emptyText="Nenhum cliente encontrado"
                className="border-0 bg-transparent shadow-none hover:bg-accent/5 h-9 px-0"
              />
            </div>

            <div className="px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm text-foreground/80 mb-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Apólice
              </div>
              <Combobox
                options={policyOptions}
                value={formData.policyId}
                onValueChange={value => handleInputChange('policyId', value)}
                placeholder="Associar a uma apólice (opcional)"
                searchPlaceholder="Buscar apólice por tipo, seguradora ou número..."
                emptyText="Nenhuma apólice encontrada"
                className="border-0 bg-transparent shadow-none hover:bg-accent/5 h-9 px-0"
              />
            </div>
          </div>

          {/* ── Notas ── */}
          <Textarea
            value={formData.notes}
            onChange={e => handleInputChange('notes', e.target.value)}
            placeholder="Adicionar notas ou avisos importantes..."
            className="min-h-[100px] resize-none border-0 bg-muted/20 rounded-2xl p-4 focus-visible:ring-1 focus-visible:ring-primary/30 placeholder:text-muted-foreground/50 text-sm shadow-none"
            rows={3}
          />
        </div>

        {/* ── Rodapé Apple Wallet Style ── */}
        <div className="p-6 bg-background/50 backdrop-blur-sm border-t border-border/10 flex gap-3">
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            className="h-12 w-1/3 rounded-xl bg-accent/10 hover:bg-accent/20 text-foreground font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isAdding}
            className="h-12 flex-1 rounded-xl bg-primary hover:brightness-110 text-primary-foreground font-semibold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isAdding ? 'Criando...' : 'Criar Agendamento'}
          </button>
        </div>
      </form>
    </DialogContent>
  );

  if (!triggerButton) {
    return (
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        {modalContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      {modalContent}
    </Dialog>
  );
}
