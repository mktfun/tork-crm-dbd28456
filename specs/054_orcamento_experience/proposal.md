# Spec 054: Orçamento Experience Redesign

## Contexto

Atualmente, ao criar uma nova apólice na tela de Apólices, o corretor passa por um formulário multi-step genérico (PolicyFormModal) que serve tanto para orçamentos quanto para apólices ativas, não fazendo distinção da jornada de cada um.

O pedido é redesenhar completamente a experiência de **Orçamento** para ser:

1. **Leve e focada** — Criar um orçamento deve ser rápido: seleciona o cliente e arrasta o PDF. Pronto.
2. **Inteligente** — A tela de detalhes de um Orçamento deve mostrar o **Proposal Dashboard** com rastreamento, link e WhatsApp — não os dados da apólice.
3. **Bifurcada** — O `PolicyFormModal` completo e complexo continua existindo, mas **apenas para status Ativa/Aguardando Apólice**. "Orçamento" tem um flow separado.

---

## User Stories

| ID | História |
|----|----------|
| US01 | Como corretor, quero criar um orçamento em 2 etapas: selecionar cliente → importar PDF |
| US02 | Como corretor, quero que a tela de detalhe do Orçamento mostre o dashboard de proposta interativa (tracking, link, WhatsApp) |
| US03 | Como corretor, quero que ao clicar "Nova Apólice" eu seja direcionado corretamente: se for Orçamento → Orçamento Experience; se for Ativa → PolicyFormModal clássico |
| US04 | Como corretor, quero que ao criar o orçamento já seja gerada a proposta interativa automaticamente (com token) |
| US05 | Como corretor, quero ver o link da proposta e ter um botão de copiar e outro de enviar por WhatsApp na tela de detalhe |

---

## O que JÁ EXISTE e será REUTILIZADO

| Item | Arquivo | Uso |
|------|---------|-----|
| `DealProposalsTab` | `src/components/crm/proposals/DealProposalsTab.tsx` | Base do dashboard de proposta |
| `ProposalAnalyticsDashboard` | `src/components/crm/proposals/ProposalAnalyticsDashboard.tsx` | Dashboard de tracking |
| `ProposalPDFImporter` | `src/components/crm/proposals/ProposalPDFImporter.tsx` | Upload + extração do PDF |
| `useCreateProposal` | `src/hooks/useProposals.ts` | Criação da proposta no backend |
| `useProposalByDeal` | `src/hooks/useProposals.ts` | Busca proposta vinculada |
| `PolicyFormModal` | `src/components/policies/PolicyFormModal.tsx` | Mantido SOMENTE para não-orçamentos |
| `useSupabaseClients` | `src/hooks/useSupabaseClients.ts` | Lista de clientes para seleção |
| `addPolicy` | `src/hooks/useSupabasePolicies.ts` | Criar o registro de orçamento |
| `PolicyDetails.tsx` | `src/pages/PolicyDetails.tsx` | Página de detalhes — terá branch por status |

---

## O que precisa ser CRIADO

| Item | Onde | O que faz |
|------|------|-----------|
| `BudgetCreationFlow` | `src/components/policies/BudgetCreationFlow.tsx` | Modal animado 2-steps: Selecionar Cliente → Importar PDF |
| `BudgetDetailsView` | `src/components/policies/BudgetDetailsView.tsx` | Tela que substitui o layout normal quando `status === 'Orçamento'` dentro de `PolicyDetails.tsx` |

---

## Critérios de Aceite

- [ ] Clicar em "Nova Apólice" → aparece um seletor inicial: "Criar Orçamento" (destaque) ou "Registrar Apólice Ativa"
- [ ] "Criar Orçamento" → abre `BudgetCreationFlow` com:
  - **Step 1:** Busca/seleção do cliente com animação slide. Apenas nome + confirmar.
  - **Step 2:** Área de drag-and-drop ou botão de upload do PDF de cotação. Sem onboarding, sem multi-step.
  - Ao concluir: cria o orçamento no BD + gera proposta interativa automaticamente com token.
- [ ] Apólices com `status === 'Orçamento'` no detalhe mostram `BudgetDetailsView` (dashboard de proposta)
- [ ] Apólices com outros status mostram o layout normal atual (`PolicyDetails.tsx`)
- [ ] Toda animação feita com `framer-motion` (já instalado no projeto)
