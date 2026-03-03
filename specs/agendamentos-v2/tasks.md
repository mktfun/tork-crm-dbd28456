# Tasks: Agendamentos v2 — Tork CRM

## Fase 0 — Inventário (OBRIGATÓRIA)
- [x] Analisar `Appointments.tsx` (464 linhas, FullCalendar)
- [x] Mapear componentes existentes (5 componentes, 2 hooks, 1 PDF generator)
- [x] Verificar schema via Supabase (appointments → clientes, apolices, ramos)
- [x] Auditar versão deployada (sgc.gestorpulse.com.br)

## Fase 1 — Enriquecer Dados (Backend)
- [ ] Alterar query principal em `useSupabaseAppointments.ts` para join com clientes + apolices + ramos
- [ ] Alterar `useRenewalAppointments.ts` para incluir ramo
- [ ] Definir tipo enriquecido `AppointmentWithRelations`

## Fase 2 — UI (Frontend — Antigravity direto, <200 linhas por arquivo)
- [ ] Lista "Agenda do Período" — mostrar ramo + info do cliente
- [ ] FullCalendar events — incluir ramo no renderEventContent
- [ ] Modal de detalhes — adicionar ramo badge + info do cliente + botão editar
- [ ] Modal de exportação — adicionar opção de incluir ramo

## Fase 3 — PDF Export
- [ ] Adicionar colunas: Ramo, Cliente, Nº Apólice na tabela
- [ ] Melhorar header visual do PDF
- [ ] Melhorar layout geral

## Fase 4 — Verificação
- [ ] Build sem erros
- [ ] Testar no browser com `/crm-test`
- [ ] Validar nome+ramo na lista, calendário, e PDF
