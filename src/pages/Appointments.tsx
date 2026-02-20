import { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, Plus, ListChecks, CalendarDays, MoreVertical, Search } from 'lucide-react';
import { AppointmentModal } from '@/components/appointments/AppointmentModal';
import { AppointmentDetailsModal } from '@/components/appointments/AppointmentDetailsModal';
import { StatsBar } from '@/components/appointments/StatsBar';
import { ExportAppointmentsModal } from '@/components/appointments/ExportAppointmentsModal';
import { AppCard } from '@/components/ui/app-card';
import { useAppointments } from '@/hooks/useAppData';
import { useSupabaseAppointments } from '@/hooks/useSupabaseAppointments';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { ptBR } from 'date-fns/locale';

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
  const { weeklyStats, isLoadingStats } = useSupabaseAppointments();

  const getAppointmentColor = (appointment: any) => {
    const now = new Date();
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const isOverdue = appointmentDateTime < now && appointment.status === 'Pendente';

    switch (appointment.status) {
      case 'Realizado':
        return { backgroundColor: '#16a34a', borderColor: '#15803d' };
      case 'Cancelado':
        return { backgroundColor: '#dc2626', borderColor: '#b91c1c' };
      case 'Pendente':
        if (isOverdue) {
          return { backgroundColor: '#dc2626', borderColor: '#b91c1c' };
        }
        return { backgroundColor: '#3b82f6', borderColor: '#2563eb' };
      default:
        return { backgroundColor: '#3b82f6', borderColor: '#2563eb' };
    }
  };

  const eventsParaCalendario = useMemo(() => {
    if (!appointments) return [];
    return appointments.map(apt => {
      const colors = getAppointmentColor(apt);
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
          parent_appointment_id: apt.parent_appointment_id
        },
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        textColor: '#ffffff'
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
      const passaStatus = filtroLista === 'Todos' || apt.status === filtroLista;
      const passaBusca = !buscaLista || apt.title?.toLowerCase().includes(buscaLista.toLowerCase());
      return passaStatus && passaBusca;
    });
  }, [appointmentsDoMes, filtroLista, buscaLista]);

  const irParaAnterior = () => {
    calendarRef.current?.getApi().prev();
    atualizarTitulo();
  };

  const irParaProximo = () => {
    calendarRef.current?.getApi().next();
    atualizarTitulo();
  };

  const irParaHoje = () => {
    calendarRef.current?.getApi().today();
    atualizarTitulo();
  };

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
    const appointmentId = clickInfo.event.id;
    const appointment = appointments.find(a => a.id === appointmentId);
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
            <ToggleGroupItem value="mes" className="text-sm px-3 py-1">
              Mês
            </ToggleGroupItem>
            <ToggleGroupItem value="semana" className="text-sm px-3 py-1">
              Semana
            </ToggleGroupItem>
            <ToggleGroupItem value="agenda" className="text-sm px-3 py-1">
              Agenda
            </ToggleGroupItem>
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
      <AppCard className="p-4">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={eventsParaCalendario}
          locale={ptBR}
          headerToolbar={false}
          height="70vh"
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
          eventMouseEnter={(info) => { info.el.style.cursor = 'pointer'; }}
          aspectRatio={1.35}
          handleWindowResize={true}
        />
      </AppCard>

      {/* Appointments Table */}
      <div className="glass-component p-6">
        {/* Table Header */}
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
            {['Todos', 'Pendente', 'Realizado', 'Cancelado'].map(s => (
              <Button
                key={s}
                size="sm"
                variant={filtroLista === s ? 'default' : 'outline'}
                onClick={() => setFiltroLista(s)}
                className="h-8 text-xs"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {appointmentsListaFiltrada.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum agendamento para este período.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente / Título</TableHead>
                <TableHead className="hidden md:table-cell">Observações</TableHead>
                <TableHead>Data · Hora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointmentsListaFiltrada.map(apt => {
                const isOverdue = new Date(`${apt.date}T${apt.time}`) < new Date() && apt.status === 'Pendente';
                const statusLabel = isOverdue ? 'Atrasado' : apt.status;

                const statusClasses: Record<string, string> = {
                  Realizado: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
                  Cancelado: 'bg-destructive/10 text-destructive border-destructive/30',
                  Pendente: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
                  Atrasado: 'bg-destructive/10 text-destructive border-destructive/30',
                };

                return (
                  <TableRow
                    key={apt.id}
                    className="cursor-pointer"
                    onClick={() => handleViewAppointmentDetails(apt.id)}
                  >
                    <TableCell>
                      <p className="font-medium text-foreground text-sm truncate max-w-[200px]">{apt.title}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-muted-foreground truncate max-w-[250px]">{apt.notes || '—'}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">
                        {new Date(apt.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1.5">{apt.time?.substring(0, 5)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClasses[statusLabel] || statusClasses['Pendente']}`}>
                        {statusLabel}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewAppointmentDetails(apt.id)}>
                            Ver detalhes
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
