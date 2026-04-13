# Master Spec: Finance Module Redesign & Bug Fixes

## 1. Visão Geral
O módulo financeiro do Tork CRM apresenta inconsistências de design (UI desencontrada, múltiplos componentes agindo de forma diferente), instabilidade de KPIs (números quebrando na interface) e falhas e edge-cases funcionais, especialmente na feature de Conciliação de Comissões vs Extrato bancário.
Nosso objetivo é padronizar a UI seguindo rigorosamente o `shadcn/ui`, componentizar lógicas quebradas em um "Feature-Sliced Design", e sanar as faltas de confiabilidade do modelo de dados.

## 2. Escopo da Funcionalidade (Requisitos)

### 2.1. Padronização de Interface (UI/UX)
- [ ] Mapear todas as telas e abas do Módulo Financeiro (Dashboard principal, Extratos, Conciliação, Contas a Pagar/Receber).
- [ ] Padronizar `Cards`, `Tables` e `Buttons` conforme os Tokens do design system estabelecido.
- [ ] Remover e consolidar variações de componentes semelhantes criados durante iterações passadas da IA.

### 2.2. Correção de Lógica e KPIs (React Query / Supabase)
- [ ] Identificar a causa dos KPIs que "quebram do nada" (possíveis tipagens erradas como `any`, `null` pointers ou RPCs falhando silenciosamente no Supabase).
- [ ] Refatorar os Hooks do React-Query responsáveis pelas métricas para lidarem com loading states, fallback e retry.

### 2.3. Conciliação de Comissões (Engenharia e Fluxo)
- [ ] Mapear o problema atual: por que "conciliar comissões a receber de cias com extrato" não funciona em 100% dos testes.
- [ ] Consolidar DDL/RPC: Ajustar qualquer defasagem pontual via banco de dados usando `supabase migration`.

## 3. Requisitos Fechados (Engenharia e Escopo)
*Feedback do Usuário absorvido com sucesso:*
1. **Foco Visual Principal:** A tela de **Conciliação** foi apontada como o patinho feio e de maior urgência para Redesign ("a de conciliação").
2. **Crash de KPIs:** Após rodar a conciliação (que deveria compor o resultado de Receita), os KPIs principais de receita no período simplesmente zeram na visualização global, apesar de entrar corretamente no saldo do banco.
3. **Problemas do Fluxo de Conciliação:**
   - A listagem tem UX ruim (difícil parear o lado da esquerda com a direita).
   - O sistema confunde botões de baixa manual de comissão com botões de conciliação de extrato normal.
   - O histórico/log de rastreio de auditoria de quem fez a conciliação não salva ou não funciona corretamente.
   - **Gargalo no Plano de Contas:** Ao selecionar várias receitas e despesas num extrato (bulk), o sistema obriga a escolher um plano de contas transação por transação, inviabilizando a conciliação rápida em lote.
## 4. Arquitetura
- O código sairá de dezenas de componentes soltos no `src/components/financeiro` e passará a residir num Feature-Slice em `src/features/finance/`.
- Regras de banco (Migrations) e Typescript Types totalmente acoplados.
