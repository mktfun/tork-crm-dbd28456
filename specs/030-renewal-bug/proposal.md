# Proposal 030: Fix Policy Automatic Renewal Appointment Bug

## Requisitos e Contexto
O usuário relatou um bug crítico: ao registrar ou renovar uma apólice (ex: empurrando o vencimento para 2027), o sistema **não está criando o agendamento de renovação de 2027**. 
O sistema sinaliza na tela que a renovação está habilitada, mas o registro real na tabela de `appointments` não ocorre.

## Causa Raiz
No Supabase, a criação automática de agendamentos de renovação é gerenciada por uma **Trigger PostgreSQL** (`handle_policy_renewal_schedule`) na tabela `apolices`.
O código atual da trigger tem a seguinte falha lógica para atualizações:
```sql
  IF NEW.status = 'Ativa' AND NEW.automatic_renewal = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.appointments 
      WHERE policy_id = NEW.id AND title LIKE 'Renovação%'
    ) THEN
      ...insert...
```
A cláusula `NOT EXISTS` procura por **QUALQUER** agendamento com `title LIKE 'Renovação%'` vinculado à apólice.
Se a apólice for uma renovação de um ano anterior, **já existirá** um agendamento antigo no banco de dados. Logicamente, o `NOT EXISTS` retorna falso e a trigger **aborta silenciosamente** a criação do novo agendamento para o ano correto.

## O Que Já Existe
- A trigger PostgreSQL `handle_policy_renewal_schedule` no Supabase.
- A tela de detalhes da apólice que reflete corretamente o estado visual baseando-se no que *deveria* acontecer.
- O componente `RenewPolicyModal` que atualiza a apólice.

## O Que Precisa Ser Feito
Para corrigir isso de forma robusta e sem duplicatas:
1. **Modificar a Trigger PostgreSQL (`handle_policy_renewal_schedule`)**
   - Atualizar a verificação `NOT EXISTS` para checar se já existe um agendamento de renovação **especificamente para o novo ciclo de vencimento**.
   - Ou seja, validar se o `date` do agendamento é o novo `(NEW.expiration_date - 15 days)`.
2. **Lidar com Atualizações Manuais e Antigas**
   - Se o vencimento foi atualizado (ex: a apólice foi renovada para o próximo ano), qualquer agendamento de renovação antigo que tenha ficado esquecido no status 'Pendente' para o ano passado deve ser cancelado ou marcado como concluído para manter o Kanban limpo.
   - Criar o novo agendamento de 2027 normalmente.

## Critérios de Aceite
- Quando uma apólice é renovada e ganha um novo `expiration_date`, um **novo agendamento** deve ser gerado no banco exatamente para 15 dias antes dessa nova data.
- Se o usuário editar a data manualmente por 1 ou 2 dias, o sistema deve **atualizar** a data do agendamento de renovação existente para aquele ano (para não duplicar). Se for mudança de ciclo (ano novo), cria um novo.
- Zero duplicação de eventos.
