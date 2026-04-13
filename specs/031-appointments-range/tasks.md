# Tasks 031: Fix Appointments Calendar (1000-Row Limit)

- [x] Refatorar `useSupabaseAppointments.ts` para aceitar `dateRange` e aplicar `.gte/.lte` na query principal
- [x] Refatorar `weeklyStats` para usar o mesmo `dateRange` do período visível
- [x] Atualizar `useAppData.ts` para aceitar e repassar `dateRange`
- [x] Atualizar `Appointments.tsx` para capturar `datesSet` do FullCalendar e passar ao hook
- [x] Corrigir labels do `StatsBar.tsx` para refletir "Período Visível"
- [x] Build passou sem erros nos arquivos alterados
- [ ] Testar navegação para jan/2027 e confirmar carregamento (aguardando deploy do Lovable)
