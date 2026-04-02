# Tasks 031: Fix Appointments Calendar (1000-Row Limit)

- [ ] Refatorar `useSupabaseAppointments.ts` para aceitar `dateRange` e aplicar `.gte/.lte` na query principal
- [ ] Refatorar `weeklyStats` para usar o mesmo `dateRange` do período visível
- [ ] Atualizar `useAppData.ts` para aceitar e repassar `dateRange`
- [ ] Atualizar `Appointments.tsx` para capturar `datesSet` do FullCalendar e passar ao hook
- [ ] Corrigir labels do `StatsBar.tsx` para refletir "Período Visível"
- [ ] Testar navegação para jan/2027 e confirmar carregamento
