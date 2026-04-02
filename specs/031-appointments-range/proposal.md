# Proposal 031: Fix Appointments Calendar Empty in 2027 (Supabase 1000-Row Limit)

## Problema
Os 1295 agendamentos existem no banco, mas o hook `useSupabaseAppointments.ts` faz `.select(*)` **sem filtro de data e sem `.range()`**, resultando no limite padrão do Supabase de **1000 linhas**. Como a ordenação é `ascending` (mais antigo primeiro), os 1000 primeiros registros param em nov/2026. Janeiro/2027 nunca chega ao React.

## O que JÁ EXISTE e será REUTILIZADO
| Arquivo | Papel |
|---|---|
| `src/hooks/useSupabaseAppointments.ts` | Hook principal — será **refatorado** |
| `src/pages/Appointments.tsx` | Página do calendário — será ajustada para passar o período visível |
| `src/components/appointments/StatsBar.tsx` | Cards de stats — label "Total do Mês" vs dados da semana |
| `src/hooks/useAppData.ts` | Wrapper que chama `useSupabaseAppointments` — será atualizado p/ passar `dateRange` |

## O que precisa ser CRIADO
**Nenhum arquivo novo.** Apenas refatoração nos 4 arquivos acima.

## Correção Principal
1. `useSupabaseAppointments` passa a receber `{ startDate, endDate }` opcionais.
2. A query principal aplica `.gte('date', startDate).lte('date', endDate)` quando fornecidos.
3. A query de `weeklyStats` será trocada para receber o mesmo período visível (alinhando os cards do `StatsBar` com o calendário).

## Integração com a Tela
1. `Appointments.tsx` captura a janela visível do FullCalendar no callback `datesSet`.
2. Passa `{ startDate, endDate }` para o hook via estado.
3. O `queryKey` inclui as datas para invalidar cache ao trocar de mês/semana.

## Ajuste de Consistência
`StatsBar.tsx` mostra "Total do Mês" mas consome `weeklyStats` que busca pela **semana atual**.
→ Renomear para "Semana Atual" ou recalcular com base no período visível. Optaremos por **recalcular com base no período visível**, alinhando tudo.

## Critérios de Aceite
- Janeiro/2027 carrega os 95 agendamentos existentes.
- Trocar para fevereiro/2027 carrega os respectivos.
- Cards do StatsBar refletem o período visível (não mais a semana fixa).
- A "Agenda do Período" mostra os mesmos itens do calendário.
- Dashboard de próximos agendamentos (`upcomingAppointments`) não regride (continua independente).
- Export PDF usa o mesmo recorte.
