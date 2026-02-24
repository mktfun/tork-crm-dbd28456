import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, Plus, ListChecks, CalendarDays, Search, CheckCircle, RefreshCw } from 'lucide-react';
import { AppointmentModal } from '@/components/appointments/AppointmentModal';
import { AppointmentDetailsModal } from '@/components/appointments/AppointmentDetailsModal';
import { StatsBar } from '@/components/appointments/StatsBar';
import { ExportAppointmentsModal } from '@/components/appointments/ExportAppointmentsModal';
import { AppCard } from '@/components/ui/app-card';
import { useAppointments } from '@/hooks/useAppData';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import { useToast } from '@/hooks/use-toast';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// === Pastel washed event colors ===
function getEventClasses(appointment: any) {
  const now = new Date();
  const dt = new Date(`${appointment.date}T${appointment.time}`);
  const isOverdue = dt < now && appointment.status === 'Pendente';

  if (appointment.status === 'Realizado') {
    return {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-l-2 border-l-emerald-500',
      label: 'Realizado',
    };
  }
  if (appointment.status === 'Cancelado') {
    return {
      bg: 'bg-muted/60',
      text: 'text-muted-foreground line-through',
      border: 'border-l-2 border-l-muted-foreground/40',
      label: 'Cancelado',
    };
  }
  if (isOverdue) {
    return {
      bg: 'bg-amber-500/15',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-l-2 border-l-amber-500',
      label: 'Atrasado',
    };
  }
  // Pendente
  return {
    bg: 'bg-blue-500/15',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-l-2 border-l-blue-500',
    label: 'Pendente',
  };
}

// FullCalendar needs hex-ish colors for its internal rendering
function getCalendarEventColor(appointment: any) {
  const now = new Date();
  const dt = new Date(`${appointment.date}T${appointment.time}`);
  const isOverdue = dt < now && appointment.status === 'Pendente';

  if (appointment.status === 'Realizado') return { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10b981', textColor: '#047857' };
  if (appointment.status === 'Cancelado') return { backgroundColor: 'rgba(156,163,175,0.2)', borderColor: '#9ca3af', textColor: '#6b7280' };
  if (isOverdue) return { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: '#f59e0b', textColor: '#b45309' };
  return { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', textColor: '#1d4ed8' };
}

export default function Appointments() {
  const [modoDeVisao, setModoDeVisao] = useState('mes');
  const [dataDeReferencia, setDataDeReferencia] = useState(new Date());
  const [isModalAberto, setIsModalAberto] = useState(false);
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [agendamentoSelecionado, setAgendamentoSelecionado] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [tituloAtual, setTituloAtual] = useState('');
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>();
  const [filtroLista, setFiltroLista] = useState('Todos');
  const [buscaLista, setBuscaLista] = useState('');
  const calendarRef = useRef<FullCalendar>(null);

  const { appointments } = useAppointments();
  const { weeklyStats, isLoadingStats, updateAppointment, isUpdating } = useSupabaseAppointments();
  const { toast } = useToast();

  const eventsParaCalendario = useMemo(() => {
    if (!appointments) return [];
    return appointments.map(apt => {
      const colors = getCalendarEventColor(apt);
      return {
        id: apt.id,
        title: apt.title,
        start: `${apt.date}T${apt.time}`,
        allDay: false,
        extendedProps: {
          time: apt.time,
          status: apt.status,
          client_id: apt.client_id,
          policy_id: apt.policy_id,
          notes: apt.notes,
          recurrence_rule: apt.recurrence_rule,
          parent_appointment_id: apt.parent_appointment_id,
          date: apt.date,
        },
        ...colors,
      };
    });
  }, [appointments]);

  // Appointments filtered by current month for the table
  const appointmentsDoMes = useMemo(() => {
    if (!appointments) return [];
    const inicio = new Date(dataDeReferencia.getFullYear(), dataDeReferencia.getMonth(), 1);
    const fim = new Date(dataDeReferencia.getFullYear(), dataDeReferencia.getMonth() + 1, 0);
    return appointments
      .filter(apt => {
        const d = new Date(apt.date + 'T12:00:00');
        return d >= inicio && d <= fim;
      })
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  }, [appointments, dataDeReferencia]);

  const appointmentsListaFiltrada = useMemo(() => {
    return appointmentsDoMes.filter(apt => {
      const now = new Date();
      const dt = new Date(`${apt.date}T${apt.time}`);
      const isOverdue = dt < now && apt.status === 'Pendente';
      const effectiveStatus = isOverdue ? 'Atrasado' : apt.status;

      const passaStatus = filtroLista === 'Todos' || effectiveStatus === filtroLista || (filtroLista === 'Pendente' && apt.status === 'Pendente' && !isOverdue);
      const passaBusca = !buscaLista || apt.title?.toLowerCase().includes(buscaLista.toLowerCase());
      return passaStatus && passaBusca;
    });
  }, [appointmentsDoMes, filtroLista, buscaLista]);

  // Group appointments by day
  const groupedByDay = useMemo(() => {
    const groups: Record<string, typeof appointmentsListaFiltrada> = {};
    appointmentsListaFiltrada.forEach(apt => {
      if (!groups[apt.date]) groups[apt.date] = [];
      groups[apt.date].push(apt);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [appointmentsListaFiltrada]);

  const irParaAnterior = () => { calendarRef.current?.getApi().prev(); atualizarTitulo(); };
  const irParaProximo = () => { calendarRef.current?.getApi().next(); atualizarTitulo(); };
  const irParaHoje = () => { calendarRef.current?.getApi().today(); atualizarTitulo(); };

  const atualizarTitulo = () => {
    setTimeout(() => {
      const api = calendarRef.current?.getApi();
      if (api) {
        setTituloAtual(api.view.title);
        setDataDeReferencia(api.getDate());
      }
    }, 100);
  };

  const handleDateClick = (arg: { dateStr: string }) => {
    setDataAgendamento(arg.dateStr);
    setIsModalAberto(true);
  };

  const handleEventClick = (clickInfo: { event: { id: string } }) => {
    const appointment = appointments.find(a => a.id === clickInfo.event.id);
    if (appointment) {
      setAgendamentoSelecionado(appointment);
      setIsDetailsModalOpen(true);
    }
  };

  const handleViewAppointmentDetails = (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (appointment) {
      setAgendamentoSelecionado(appointment);
      setIsDetailsModalOpen(true);
    }
  };

  const handleMarkDone = async (e: React.MouseEvent, aptId: string) => {
    e.stopPropagation();
    try {
      await updateAppointment(aptId, { status: 'Realizado' });
      toast({ title: 'Agendamento marcado como realizado!' });
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const handleViewChange = (view: string) => {
    if (view) {
      setModoDeVisao(view);
      const api = calendarRef.current?.getApi();
      if (api) {
        api.changeView(
          view === 'mes' ? 'dayGridMonth' :
            view === 'semana' ? 'timeGridWeek' : 'listWeek'
        );
        atualizarTitulo();
      }
    }
  };

  const handleNovoAgendamento = () => {
    setModalInitialDate(undefined);
    setIsModalAberto(true);
  };

  // Custom event content for FullCalendar
  const renderEventContent = (eventInfo: any) => {
    const { extendedProps } = eventInfo.event;
    const time = extendedProps.time?.substring(0, 5);
    const isRecurrence = !!extendedProps.parent_appointment_id;
    const status = extendedProps.status;
    const isCancelled = status === 'Cancelado';

    return (
      <div className="flex items-center gap-1 px-1.5 py-0.5 w-full overflow-hidden">
        <span className="text-[10px] font-mono opacity-60 flex-shrink-0">{time}</span>
        <span className={cn(
          "text-xs font-medium truncate flex-1",
          isCancelled && "line-through opacity-60"
        )}>
          {eventInfo.event.title}
        </span>
        {isRecurrence && (
          <RefreshCw className="w-2.5 h-2.5 opacity-40 flex-shrink-0" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={irParaAnterior} className="h-9 px-3">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={irParaHoje} className="h-9 px-4">
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={irParaProximo} className="h-9 px-3">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-semibold text-foreground">
            {tituloAtual}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <ToggleGroup
            type="single"
            value={modoDeVisao}
            onValueChange={handleViewChange}
            className="bg-muted rounded-lg p-1"
          >
            <ToggleGroupItem value="mes" className="text-sm px-3 py-1">Mês</ToggleGroupItem>
            <ToggleGroupItem value="semana" className="text-sm px-3 py-1">Semana</ToggleGroupItem>
            <ToggleGroupItem value="agenda" className="text-sm px-3 py-1">Agenda</ToggleGroupItem>
          </ToggleGroup>

          <ExportAppointmentsModal />

          <Button onClick={handleNovoAgendamento} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsBar weeklyStats={weeklyStats} isLoading={isLoadingStats} />

      {/* Calendar — full width */}
      <AppCard className="p-4 fc-washed-theme">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={eventsParaCalendario}
          locale={ptBR}
          headerToolbar={false}
          aspectRatio={1.6}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          datesSet={atualizarTitulo}
          dayMaxEvents={3}
          eventDisplay="block"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          listDayFormat={{ weekday: 'long' }}
          listDaySideFormat={{ day: 'numeric', month: 'short' }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false }}
          nowIndicator={true}
          selectMirror={true}
          dayHeaderFormat={{ weekday: 'short' }}
          eventContent={renderEventContent}
          handleWindowResize={true}
        />
      </AppCard>

      {/* Agenda do Período — Grouped by Day */}
      <div className="glass-component p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <ListChecks size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Agenda do Período</h3>
              <p className="text-sm text-muted-foreground">{appointmentsListaFiltrada.length} agendamentos</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={buscaLista}
                onChange={(e) => setBuscaLista(e.target.value)}
                className="h-8 w-48 text-sm pl-8"
              />
            </div>
            <ToggleGroup
              type="single"
              value={filtroLista}
              onValueChange={(v) => v && setFiltroLista(v)}
              className="bg-muted rounded-lg p-0.5"
            >
              {['Todos', 'Pendente', 'Atrasado', 'Realizado', 'Cancelado'].map(s => (
                <ToggleGroupItem key={s} value={s} className="h-7 text-xs px-3">
                  {s}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        {groupedByDay.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum agendamento para este período.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedByDay.map(([dateStr, dayAppointments]) => {
              const dateObj = new Date(dateStr + 'T12:00:00');
              const dayLabel = format(dateObj, "EEEE, dd 'de' MMMM", { locale: ptBR });

              return (
                <div key={dateStr}>
                  {/* Day section header */}
                  <div className="bg-muted/30 rounded-lg px-4 py-2 mb-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {dayLabel}
                    </span>
                  </div>

                  {/* Appointments for this day */}
                  {dayAppointments.map(apt => {
                    const classes = getEventClasses(apt);
                    const isPendingOrOverdue = apt.status === 'Pendente';

                    return (
                      <div
                        key={apt.id}
                        onClick={() => handleViewAppointmentDetails(apt.id)}
                        className={cn(
                          "group flex items-center gap-4 px-4 py-3 rounded-lg cursor-pointer transition-colors",
                          "hover:bg-muted/40"
                        )}
                      >
                        {/* Time */}
                        <span className="text-sm font-mono text-muted-foreground w-12 flex-shrink-0">
                          {apt.time?.substring(0, 5)}
                        </span>

                        {/* Left border indicator + Title */}
                        <div className={cn("flex-1 min-w-0 pl-3", classes.border)}>
                          <p className={cn("text-sm font-medium truncate", classes.text)}>
                            {apt.title}
                          </p>
                          {apt.notes && (
                            <p className="text-xs text-muted-foreground italic truncate mt-0.5">
                              {apt.notes}
                            </p>
                          )}
                        </div>

                        {/* Status badge */}
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border flex-shrink-0",
                          classes.label === 'Realizado' && 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
                          classes.label === 'Cancelado' && 'bg-muted/60 text-muted-foreground border-muted-foreground/30',
                          classes.label === 'Atrasado' && 'bg-amber-500/15 text-amber-600 border-amber-500/30',
                          classes.label === 'Pendente' && 'bg-blue-500/15 text-blue-600 border-blue-500/30',
                        )}>
                          {classes.label}
                        </span>

                        {/* Quick action: mark as done (on hover) */}
                        {isPendingOrOverdue && (
                          <button
                            onClick={(e) => handleMarkDone(e, apt.id)}
                            disabled={isUpdating}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-600"
                            title="Marcar como Realizado"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {appointmentsListaFiltrada.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Total: {appointmentsListaFiltrada.length} agendamento{appointmentsListaFiltrada.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AppointmentModal
        initialDate={modalInitialDate}
        isOpen={isModalAberto}
        onOpenChange={(open) => {
          setIsModalAberto(open);
          if (!open) setModalInitialDate(undefined);
        }}
        triggerButton={null}
      />

      <AppointmentDetailsModal
        appointment={agendamentoSelecionado}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
      />
    </div>
  );
}
