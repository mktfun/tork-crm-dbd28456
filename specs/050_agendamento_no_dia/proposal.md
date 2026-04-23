# Spec 050 — Agendamento Automático no Dia do Vencimento

## Problema

O agendamento automático de renovação de apólices está configurado para **15 dias antes do vencimento** em 3 locais do frontend e no store Zustand local. O Marcos solicitou que seja alterado para o **dia exato do vencimento**.

### Status da Trigger (Supabase)

A trigger `handle_policy_renewal_schedule()` no Supabase **já foi atualizada** na migration `20260413151454` para usar `target_date := NEW.expiration_date::date` (data exata). Porém, o batch UPDATE que deveria corrigir os agendamentos existentes referencia `public.policies` em vez de `public.apolices` — precisa verificar se rodou com sucesso ou se falhou silenciosamente.

## O que PRECISA mudar (Frontend + Store)

### 1. `src/store/index.ts` (linha 107)
```diff
- const reminderDate = subDays(expirationDate, 15); // 15 dias antes do vencimento
+ const reminderDate = expirationDate; // Data exata do vencimento
```

### 2. `src/components/policies/RenewalScheduleStatus.tsx` (linhas 21-23)
```diff
- // Data do agendamento (15 dias antes do vencimento)
- const scheduledDate = new Date(expirationDate);
- scheduledDate.setDate(scheduledDate.getDate() - 15);
+ // Data do agendamento = data exata do vencimento
+ const scheduledDate = new Date(expirationDate);
```

### 3. `src/components/policies/PolicyRenewalSection.tsx` (linhas 41-42, 61)
```diff
- renewalDate.setDate(renewalDate.getDate() - 15);
  // (remover a subtração)
```
E atualizar o texto:
```diff
- {' '}(15 dias antes do vencimento)
+ {' '}(no dia do vencimento)
```

## O que já EXISTE e será reutilizado

| Recurso | Localização | Status |
|---------|------------|--------|
| Trigger Supabase `handle_policy_renewal_schedule()` | Migration `20260413` | ✅ Já na data exata |
| Hook `useRenewalAppointments` | `src/hooks/useRenewalAppointments.ts` | ✅ Sem lógica de offset |
| Componente `RenewalAppointmentsList` | `src/components/policies/` | ✅ Renderiza datas vindas do DB |

## Batch Fix: Agendamentos existentes no banco

A migration `20260413` tentou corrigir os agendamentos existentes, mas referenciou `public.policies` em vez de `public.apolices`. Precisamos verificar e, se necessário, rodar o UPDATE correto:

```sql
UPDATE public.appointments a
SET date = p.expiration_date::date
FROM public.apolices p
WHERE a.policy_id = p.id
  AND a.title LIKE 'Renovação%'
  AND a.status = 'Pendente'
  AND p.status = 'Ativa'
  AND a.date != p.expiration_date::date;
```

## Critérios de Aceite

1. ✅ Novos agendamentos automáticos criados na data exata do vencimento
2. ✅ Agendamentos existentes pendentes atualizados para a data correta
3. ✅ Tela de detalhes da apólice exibe "no dia do vencimento" em vez de "15 dias antes"
4. ✅ Componente `RenewalScheduleStatus` mostra a data correta do vencimento
5. ✅ Store Zustand local sincronizado com a mesma lógica
