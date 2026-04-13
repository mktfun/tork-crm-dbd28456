# Tasks 030: Fix Policy Automatic Renewal Appointment Bug

- [x] Revisar implementação atual da function PostgreSQL.
- [x] Construir a nova instrução SQL inteligente para `handle_policy_renewal_schedule` contemplando as regras anuais de idempotência.
- [x] Aplicar o script no Supabase local/remoto.
- [ ] Testar atualizando o vencimento de uma apólice para constatar a criação do agendamento respectivo sem falhas.
