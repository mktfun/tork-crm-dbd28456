# Melhoria da Tela de Agendamentos — Tork CRM

## Problema
O corretor reportou que a tela de Agendamentos é funcional mas insuficiente:
- **Só mostra o nome da pessoa** — sem ramo/tipo de seguro
- **Agendamentos auto-gerados** mostram "Apólice Nº 123455" em vez de "Nome + Ramo"
- **PDF de exportação** é pobre em informação e feio
- **View Semana** é maioria espaço vazio
- **View Agenda** (FullCalendar `listWeek`) é minimalista demais
- **Modal de detalhes** é read-only, sem editar/excluir

## O Que JÁ EXISTE (Anti-Alucinação)

### Componentes Existentes (REUTILIZAR)
| Componente | Localização | Uso |
|---|---|---|
| `Appointments.tsx` | `src/pages/` | Página principal — **EDITAR** |
| `AppointmentDetailsModal.tsx` | `src/components/appointments/` | Modal de detalhes — **EDITAR** (adicionar ramo) |
| `AppointmentModal.tsx` | `src/components/appointments/` | Modal de criação — manter |
| `ExportAppointmentsModal.tsx` | `src/components/appointments/` | Modal de exportação — **EDITAR** |
| `StatsBar.tsx` | `src/components/appointments/` | Stats do período — manter |

### Hooks Existentes (REUTILIZAR)
| Hook | O que faz | Alteração |
|---|---|---|
| `useSupabaseAppointments.ts` | Query principal `.select('*')` | **EDITAR** — join com `clientes`, `apolices`, `ramos` |
| `useRenewalAppointments.ts` | Agendamentos de renovação | **EDITAR** — join com `ramos` |

### PDF Existente (REUTILIZAR)
| Arquivo | Alteração |
|---|---|
| `generateAppointmentsReport.ts` | **EDITAR** — adicionar coluna ramo, melhorar layout visual |

### Dependência Externa
- **FullCalendar** (`@fullcalendar/react`) — MANTER, não substituir (substituir = risco alto + retrabalho imenso)

---

## Propostas de Melhoria

### 1. Enriquecer Dados: Join com Ramos 🔑
**Causa raiz**: Query principal faz `.select('*')` sem joins.

**Solução**: Alterar `useSupabaseAppointments.ts` para:
```sql
SELECT *, 
  client:clientes(name, phone),
  policy:apolices(policy_number, ramo_id),
  policy_ramo:apolices(ramo:ramos(name))
FROM appointments
```

Isso traz: nome do cliente, telefone, número da apólice, e **nome do ramo**.

### 2. Melhorar Título de Agendamentos Auto-Gerados
Onde são criados os agendamentos de renovação: verificar o ponto de inserção e mudar o `title` de:
- ❌ `"Renovação — Apólice Nº 12345"`
- ✅ `"Renovação — João Silva — Auto"`

### 3. Lista "Agenda do Período" — Mostrar Ramo
Cada item da lista below-calendar passará a mostrar:
```
18:00  │▎ João Silva — Auto             Pendente    ✓
       │  Renovação da apólice #12345
```
Em vez do atual:
```
18:00  │▎ Título do agendamento          Pendente    ✓
```

### 4. FullCalendar Events — Mostrar Ramo no Tooltip
O `renderEventContent` passará a exibir: `18:00 João — Auto`.

### 5. Modal de Detalhes — Mostrar Ramo + Editar
- Adicionar badge com o ramo do seguro
- Mostrar info do cliente (nome, telefone)
- Adicionar botão "Editar" que abre o `AppointmentModal` em modo de edição

### 6. PDF de Exportação — Redesign Completo
**Problemas atuais** (visto no screenshot):
- Layout muito básico (jsPDF+autoTable genérico)
- Sem coluna de ramo
- Sem informações do cliente
- Design "planilhão"

**Solução**:
- Adicionar colunas: **Ramo**, **Cliente**, **Nº Apólice**
- Melhorar header do PDF (logo, cores do Tork CRM)
- Agrupar por dia com visual melhorado
- Adicionar resumo de stats no topo

### 7. View Semana — Personalizar Melhor *(se sobrar tempo)*
A view semanal é o FullCalendar `timeGridWeek`. Melhorar com:
- Mostrar nome do cliente + ramo nos event blocks
- Melhorar espaçamento visual

---

## O que NÃO faremos
- ❌ **Substituir FullCalendar** — risco alto, o lib funciona bem para calendário/semana
- ❌ **Criar novos hooks** — vamos editar os existentes
- ❌ **Criar novas tabelas** — tudo vem de joins entre `appointments`, `clientes`, `apolices`, `ramos`
- ❌ **Criar novos componentes** — editamos os 5 existentes

---

## Verificação
1. Build sem erros (`vite build`)
2. Testar no browser com `/crm-test` (login automático)
3. Verificar se nome do cliente + ramo aparece na lista, calendário e PDF
4. Exportar PDF e validar layout
