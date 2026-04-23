# Spec 050 — Tasks

- [ ] **Frontend: Store Zustand** — Alterar `src/store/index.ts` para usar `expirationDate` direto em vez de `subDays(expirationDate, 15)`
- [ ] **Frontend: RenewalScheduleStatus** — Remover `setDate(getDate() - 15)` em `RenewalScheduleStatus.tsx`
- [ ] **Frontend: PolicyRenewalSection** — Remover `setDate(getDate() - 15)` e atualizar texto para "no dia do vencimento" em `PolicyRenewalSection.tsx`
- [ ] **Backend: Verificar migration** — Confirmar se a migration `20260413` rodou e se o batch UPDATE precisa ser corrigido (tabela `policies` vs `apolices`)
- [ ] **Backend: Batch Fix** — Rodar UPDATE para sincronizar agendamentos pendentes existentes para a data correta
- [ ] **Validação** — Build limpo + testar na tela de detalhes da apólice
