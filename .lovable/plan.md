

# Prompt 28 -- Redesign da Tela de Agendamentos

## Overview

Redesign the Appointments page to remove the unused sidebar panel, update KPIs to use semantic design tokens, fix hardcoded legacy colors, improve FullCalendar CSS integration, and add a filterable appointments table below the calendar.

## Files to Modify

### 1. `src/components/appointments/StatsBar.tsx`
- Replace the 4 legacy KPIs (hardcoded blue/green/red/purple colors) with semantic design system tokens
- Replace "Taxa de Comparecimento" with "Pendentes" (more actionable)
- Add `Clock` icon import from lucide
- Add computed subtitle showing percentage for "Realizados"
- Remove all `text-white`, `bg-blue-500/20`, `bg-green-500/20`, `bg-red-500/20`, `bg-purple-500/20`, `hover:shadow-white/5` classes
- New color mapping: Total=`primary`, Realizados=`emerald-500`, Pendentes=`amber-500`, Cancelados=`destructive`
- Loading skeleton: replace `bg-white/10` and `bg-white/5` with `bg-muted`
- Card template: icon box (`p-2 rounded-lg`) + value (`text-2xl font-bold text-foreground`) + title (`text-xs text-muted-foreground uppercase`) + subtitle (`text-[11px] text-muted-foreground`)

### 2. `src/pages/Appointments.tsx`
**Header fixes:**
- Line 223: `text-white` -> `text-foreground`
- Line 233: `bg-slate-800/50` -> `bg-muted`
- Lines 237/243/249: remove `data-[state=on]:bg-blue-600 data-[state=on]:text-white`, use default `text-sm px-3 py-1`

**Remove sidebar panel:**
- Remove `AppointmentsDashboard` import and its JSX block (lines 314-325)
- Remove `upcomingAppointments`, `scheduleGaps`, `isLoadingUpcoming`, `isLoadingGaps` from `useSupabaseAppointments()` destructure
- Remove `handleScheduleAtDate` function (lines 165-168) -- only used by removed panel
- Simplify grid: remove `xl:grid-cols-[1fr,auto]`, calendar takes full width

**Add appointments list table below calendar:**
- New state: `filtroLista` (string, default `'Todos'`), `buscaLista` (string)
- New `useMemo`: `appointmentsDoMes` -- filter appointments by current month from `dataDeReferencia`
- New `useMemo`: `appointmentsListaFiltrada` -- apply status filter + text search
- New imports: `ListChecks`, `CalendarDays`, `MoreVertical`, `Clock`, `Search` from lucide; `Input` from ui; `DropdownMenu` components; `Badge`
- JSX: glass-component container with header (icon box + title + count), search input, status filter buttons, table with columns (Cliente/Titulo, Observacoes, Data/Hora, Status badge, Actions dropdown)
- Status badge colors: Realizado=emerald, Cancelado=destructive, Pendente=amber, Atrasado (overdue pending)=destructive
- Empty state with `CalendarDays` icon

### 3. `src/index.css` -- FullCalendar theme improvements
**Replace hardcoded dark-only styles with theme-aware ones:**
- Lines 399-434: `.dark .fc-theme-standard .fc-list-day-cushion` -- simplify from heavy glassmorphism to clean `bg-muted` with `border-border`
- Lines 457-470: `.dark .fc-theme-standard .fc-list-day-cushion:hover` -- simplify to `bg-muted/80`
- Lines 473-488: `.dark .fc-theme-standard .fc-list-day-text` -- use `color: hsl(var(--foreground))`, remove text-shadow/filter
- Lines 491-505: `.dark .fc-theme-standard .fc-list-day-side-text` -- use `color: hsl(var(--muted-foreground))`
- Lines 546-550: `.fc .fc-list-event` -- use `hsl(var(--card))` instead of `rgba(15, 23, 42, 0.6)`
- Lines 552-555: `.fc .fc-list-event:hover` -- use `hsl(var(--muted))` instead of `rgba(30, 41, 59, 0.8)`
- Lines 558-566: `.fc-list-event-title` and `.fc-list-event-time` -- use `hsl(var(--foreground))` and `hsl(var(--muted-foreground))`
- Add light-mode list-day-cushion rule: `bg-muted/50`
- Remove the `::before` holographic shine pseudo-element (lines 437-454)
- Remove slideInFromLeft animation for list headers (lines 514-528) -- unnecessary motion
- Add: `.fc .fc-button` styles to match design system if any default FC buttons leak through
- Add: `.fc-theme-standard .fc-list-empty` background to use `hsl(var(--background))`

### 4. `src/hooks/useSupabaseAppointments.ts` -- No logic changes needed
The `weeklyStats` query already returns `pendentes`. The `upcomingAppointments` and `scheduleGaps` queries can remain (they won't execute if not destructured, but React Query will still run them). To be safe, we keep them -- they're cached and lightweight. No changes to this file.

## Files NOT modified
- `AppointmentModal`, `AppointmentDetailsModal`, `ExportAppointmentsModal` -- untouched
- `useSupabaseAppointments.ts` -- untouched (stats already include pendentes)
- `useAppointments` (useAppData) -- untouched
- `AppointmentsDashboard.tsx` -- not deleted (import simply removed from Appointments.tsx; file kept for potential future use)

## Technical Notes
- The `appointments` array from `useAppointments()` is already the full list used by FullCalendar -- reuse it for the table
- `dataDeReferencia` is updated by FullCalendar's `datesSet` callback, so the table auto-syncs with calendar navigation
- The `handleViewAppointmentDetails` function already exists and is reused for table row clicks
- Status filter uses simple string matching against `apt.status`
- The "Atrasado" label is a computed display-only label for overdue pending appointments (same logic as `getAppointmentColor`)

