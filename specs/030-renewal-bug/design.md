# Design 030: Fix Policy Automatic Renewal Appointment Bug

## Decisões Arquiteturais

### Database (PostgreSQL)
A lógica estará contida **integralmente no banco de dados**, aproveitando o ecossistema de triggers atual, garantindo que independente da origem da renovação (N8N, Painel Web UI, Chatwoot Dispatcher, Mobile), a consistência seja mantida e os agendamentos sempre criados.

**Mudanças na Trigger `handle_policy_renewal_schedule`:**
A função será reescrita para fazer as seguintes verificações inteligentes (Upsert Logic):
1. **Calcular a Alvo (Target Date):** `NEW.expiration_date - INTERVAL '15 dias'`.
2. **Procurar o agendamento correto (Target Appointment):**
   - Se já existe um agendamento cujo `EXTRACT(YEAR FROM date)` seja igual ao ano da Target Date, ele assume que **já existe agendamento de renovação para esse ciclo anual**.
   - Se existir, e o vencimento da apólice sofreu pequenos ajustes de dia/mês (dentro do mesmo ano), ele faz um `UPDATE` no agendamento existente para coincidir com os `15 dias` exatos, mantendo-o atualizado (previne duplicatas no mesmo ciclo).
3. **Mudar de Ciclo Energético (Nova Renovação Anual):**
   - Se não existir nenhum agendamento para o **ANO** do Target Date, significa que o cliente renovou do ciclo X para X+1 (ex: de 2026 para 2027).
   - O sistema fará um `INSERT` de um **NOVO** agendamento de renovação (para 2027).
   - **(Ação Higiênica):** Opcionalmente, varrer os agendamentos antigos dessa apólice que ainda estejam `Pendente` e tenham data `< CURRENT_DATE`, mudando seus status para `Concluído`, já que a apólice foi formalmente renovada e evita poluição do Kanban do corretor!

## Mapa de Dependências
- **Apenas Banco de Dados (`handle_policy_renewal_schedule`)**
- Nenhuma mudança front-end necessária. A UI já baseia seu comportamento no fato da rotina Supabase fazer a inserção na tabela `appointments`.
