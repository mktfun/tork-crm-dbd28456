# Design: Orçamento Experience Redesign (054)

## Bifurcação no "Nova Apólice"

### Antes (atual)
```
[Nova Apólice] → PolicyFormModal (multi-step, mesmo para orçamentos e apólices)
```

### Depois (novo)
```
[Nova Apólice] → Modal seletor
                    ├── "Criar Orçamento Interativo" (destaque visual) → BudgetCreationFlow
                    └── "Registrar Apólice Ativa/Aguardando" → PolicyFormModal (inalterado)
```

---

## BudgetCreationFlow — Layout e Animações

**Stack:** `framer-motion` para transições, `shadcn/ui` para componentes base.

### Step 1 — Selecionar Cliente
```
┌────────────────────────────────────────────────────────┐
│  👤 Para qual cliente é este orçamento?                │
│                                                        │
│  [🔍 Buscar cliente...]                                │
│                                                        │
│  ● Ana Beatriz Santarelli                              │
│  ● João Carlos da Silva                                │
│  ● Maria Aparecida...                                  │
│                                                        │
│            [→ Continuar]                               │
└────────────────────────────────────────────────────────┘
```
- Animação: `slide-in-from-right` ao entrar, `slide-out-to-left` ao avançar.
- Lista de clientes via `useSupabaseClients`. Busca client-side por nome/CPF.
- Sem "Cadastrar novo cliente" neste step (mantém o foco).

### Step 2 — Importar PDF
```
┌────────────────────────────────────────────────────────┐
│  📄 Cotação de Ana Beatriz                             │
│                                                        │
│  ┌────────────────────────────────┐                   │
│  │                                │                   │
│  │    ☁ Arraste o PDF aqui        │                   │
│  │    ou clique para selecionar    │                   │
│  │                                │                   │
│  └────────────────────────────────┘                   │
│                                                        │
│  A IA irá extrair as opções automaticamente.           │
│  Você pode revisar antes de gerar o link.              │
│                                                        │
│  [← Voltar]                    [✓ Gerar Proposta]     │
└────────────────────────────────────────────────────────┘
```
- Reutiliza `ProposalPDFImporter` como base, mas com drag-and-drop próprio.
- Ao clicar "Gerar Proposta":
  1. Chama `addPolicy` com `status: 'Orçamento'` e dados mínimos (client_id + asset vazio + premium 0)
  2. Chama `useCreateProposal` com o policyId gerado + opções extraídas
  3. Redireciona para `/dashboard/policies/{id}` que mostrará o `BudgetDetailsView`

---

## BudgetDetailsView — Layout da Tela de Detalhe do Orçamento

Substitui o layout atual de `PolicyDetails.tsx` quando `status === 'Orçamento'`.

```
┌──────────────────────────────────────────────────┐
│  ← Voltar    |  Orçamento · Ana Beatriz          │
│              |  🔵 Em Aberto                     │
├─────────────────────────────────────┬────────────┤
│                                     │ SIDEBAR     │
│  📊 Dashboard da Proposta           │             │
│  ─────────────────────────────      │ 📋 Infos   │
│  👁 Visualizações: 0               │  Cliente    │
│  ⏱ Tempo Gasto: 0 min             │  Data       │
│  🌡 Temperatura: COLD              │  Bem aseg. │
│                                     │             │
│  🔗 Link da Proposta               │ 🔧 Ações   │
│  [proposta.torkcrm/abc123] [📋]    │  Copiar    │
│  [WhatsApp] [Visualizar]           │  WhatsApp  │
│                                     │  Converter │
│  📅 Timeline de Eventos            │  em Apólice│
│  (nenhuma interação ainda)          │             │
└─────────────────────────────────────┴────────────┘
```

**Componente:** `BudgetDetailsView.tsx` usa `ProposalAnalyticsDashboard` e `useProposalByDeal(policy.id)`.

---

## Dependências entre Componentes

```
BudgetCreationFlow.tsx
  ├── useSupabaseClients       (step 1)
  ├── ProposalPDFImporter      (step 2, reutilizado)
  ├── addPolicy (usePolicies)  (criar registro)
  └── useCreateProposal        (criar proposta + token)

BudgetDetailsView.tsx
  ├── useProposalByDeal(policy.id)
  ├── ProposalAnalyticsDashboard
  └── copyLink + buildWhatsAppLink (utilitários inline)

PolicyDetails.tsx (modificado)
  └── if status === 'Orçamento' → render <BudgetDetailsView />
      else → render layout atual
      
Policies.tsx (modificado)
  └── "Nova Apólice" → Modal Seletor bifurcado
```

---

## Animações (framer-motion)

| Elemento | Animação |
|----------|----------|
| Transição Step 1 → Step 2 | `x: 0 → -100% / 100% → 0` |
| Modal seletor inicial | `scale: 0.95 → 1 + opacity: 0 → 1` |
| Cards de cliente | `stagger 0.05s` na lista |
| Drag-and-drop zone | `scale` ao hover, `border-color` pulsante |
