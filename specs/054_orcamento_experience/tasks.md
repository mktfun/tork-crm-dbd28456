# Tasks: 054 — Orçamento Experience Redesign

## Fase 1 — Seletor Inicial no "Nova Apólice"

- [x] **1.1** Modificar `Policies.tsx`: substituir o botão "Nova Apólice" por um botão que abre um modal seletor pequeno
- [x] **1.2** Modal seletor tem duas opções: "Criar Orçamento" e "Registrar Apólice"
- [x] **1.3** "Registrar Apólice" → abre o `PolicyFormModal` existente (SEM mudanças nele)

## Fase 2 — BudgetCreationFlow

- [x] **2.1** Criar `src/components/policies/BudgetCreationFlow.tsx`
- [x] **2.2** Step 1: campo de busca + lista de clientes animada (framer-motion stagger)
- [x] **2.3** Step 2: zona drag-and-drop do PDF usando `ProposalPDFImporter` internamente
- [x] **2.4** Botão "Gerar Proposta": chama `addPolicy(status: 'Orçamento', clientId, premiumValue: 0)` e em seguida `useCreateProposal` com token e opções
- [x] **2.5** Após sucesso: redireciona para `/dashboard/policies/{newPolicyId}`

## Fase 3 — BudgetDetailsView

- [x] **3.1** Criar `src/components/policies/BudgetDetailsView.tsx`
- [x] **3.2** Usar `useProposalByDeal(policy.id)` para buscar a proposta
- [x] **3.3** Se proposta existe: mostrar `ProposalAnalyticsDashboard` + link + botões
- [x] **3.4** Se proposta não existe (orçamento sem proposta interativa): mostrar botão "Gerar Proposta Interativa"
- [x] **3.5** Sidebar com dados básicos do cliente e botão "Converter em Apólice"

## Fase 4 — Integração no PolicyDetails.tsx

- [x] **4.1** No início do render de `PolicyDetails.tsx`, adicionar branch: `if (isBudget) return <BudgetDetailsView policy={policy} client={client} />`
- [x] **4.2** O resto do `PolicyDetails.tsx` permanece inalterado para não-orçamentos

## Fase 5 — Qualidade

- [x] **5.1** `npm run type-check` limpo
- [x] **5.2** `npm run build` limpo
- [x] **5.3** Commit semântico + push para origin e lovable


## Fase 1 — Seletor Inicial no "Nova Apólice"

- [ ] **1.1** Modificar `Policies.tsx`: substituir o botão "Nova Apólice" por um botão que abre um modal seletor pequeno
- [ ] **1.2** Modal seletor tem duas opções: "Criar Orçamento" e "Registrar Apólice"
- [ ] **1.3** "Registrar Apólice" → abre o `PolicyFormModal` existente (SEM mudanças nele)

## Fase 2 — BudgetCreationFlow

- [ ] **2.1** Criar `src/components/policies/BudgetCreationFlow.tsx`
- [ ] **2.2** Step 1: campo de busca + lista de clientes animada (framer-motion stagger)
- [ ] **2.3** Step 2: zona drag-and-drop do PDF usando `ProposalPDFImporter` internamente
- [ ] **2.4** Botão "Gerar Proposta": chama `addPolicy(status: 'Orçamento', clientId, premiumValue: 0)` e em seguida `useCreateProposal` com token e opções
- [ ] **2.5** Após sucesso: redireciona para `/dashboard/policies/{newPolicyId}`

## Fase 3 — BudgetDetailsView

- [ ] **3.1** Criar `src/components/policies/BudgetDetailsView.tsx`
- [ ] **3.2** Usar `useProposalByDeal(policy.id)` para buscar a proposta
- [ ] **3.3** Se proposta existe: mostrar `ProposalAnalyticsDashboard` + link + botões
- [ ] **3.4** Se proposta não existe (orçamento sem proposta interativa): mostrar botão "Gerar Proposta Interativa"
- [ ] **3.5** Sidebar com dados básicos do cliente e botão "Converter em Apólice"

## Fase 4 — Integração no PolicyDetails.tsx

- [ ] **4.1** No início do render de `PolicyDetails.tsx`, adicionar branch: `if (isBudget) return <BudgetDetailsView policy={policy} client={client} />`
- [ ] **4.2** O resto do `PolicyDetails.tsx` permanece inalterado para não-orçamentos

## Fase 5 — Qualidade

- [ ] **5.1** `npm run type-check` limpo
- [ ] **5.2** `npm run build` limpo
- [ ] **5.3** Commit semântico + push para origin e lovable
