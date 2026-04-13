# Finance Redesign Execution Tasks

- [ ] **Fase 1: Preparação Arquitetural**
  - [ ] Migrar componentes soltos de `src/components/financeiro` para `src/features/finance` (Feature-Sliced Design).
  - [ ] Mapear as rotas atuais (`/financeiro`, `/financeiro/extratos`, etc) para refletirem a nova estrutura.

- [ ] **Fase 2: UI & Design System (Tela de Conciliação)**
  - [ ] Refatorar a UX da Tela de Conciliação para um layout lado a lado (`1:1`).
  - [ ] Separar visualmente os botões de "Baixa Manual" vs "Conciliar Extrato".
  - [ ] Criar modal unificada para Ação em Lote (Bulk Action) perguntando o Plano de Contas apenas uma vez para o grupo de extratos selecionados.

- [ ] **Fase 3: Refatoração de KPIs e Histórico**
  - [ ] Revisar query/RPC `get_financial_summary` para garantir que as Receitas e Despesas reflitam exatamente o que foi recém conciliado (bug dos KPIs zerando).
  - [ ] Recriar ou consertar a tabela/lógica de `reconciliation_history`, garantindo auditoria rastreável (quem conciliou e o que conciliou).

- [ ] **Fase 4: Supabase Migrations & Tipos**
  - [ ] Gerar migrações SQL para a correção do `get_financial_summary` e `reconciliation_history`.
  - [ ] Atualizar as types usando `supabase gen types typescript`.
