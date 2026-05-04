# Design: 053 — Propostas Interativas

## 1. Fluxo Completo

```
[Deal no Kanban]
    └─ Aba "Proposta" → Upload PDF
         └─ Parser extrai texto → pré-preenche form (3 opções)
              └─ Corretor revisa → Publica proposta
                   └─ Link gerado → Botão "Copiar" ou "Enviar WhatsApp"

[Cliente recebe link no WhatsApp]
    └─ Abre /p/:token no celular (sem login)
         └─ Vê cards de planos, seleciona, lê coberturas
              └─ Clica "Aceitar" → Overlay de confirmação
                   ├─ Evento gravado → Deal move para stage definido
                   └─ (Opcional) Compara com apólice anterior

[Corretor no CRM — tempo real]
    └─ Aba "Proposta" → Dashboard Analytics
         └─ Views, Tempo Leitura, 🔥 Termômetro, Timeline
```

---

## 2. Banco de Dados (Migrações Supabase)

### `crm_proposals`
```sql
create table crm_proposals (
  id            uuid primary key default gen_random_uuid(),
  deal_id       uuid not null references crm_deals(id) on delete cascade,
  user_id       uuid not null references auth.users(id),
  token         text unique not null,           -- nanoid 12 chars, URL pública
  title         text not null,
  client_name   text,
  client_phone  text,
  client_vehicle text,                           -- ex: "HB20 2022 Prata"
  ramo          text default 'auto',
  valid_until   date,
  status        text default 'draft',            -- draft|sent|accepted|rejected|expired
  accepted_option_id uuid,                       -- qual opção foi aceita
  accepted_stage_id  uuid,                       -- stage destino se aceitar
  rejected_stage_id  uuid,                       -- stage destino se recusar
  enable_comparison  boolean default false,      -- ativar comparativo de apólice anterior
  total_views   int default 0,
  total_time_seconds int default 0,
  warmth        text default 'cold',             -- cold|warm|hot
  sent_at       timestamptz,
  accepted_at   timestamptz,
  created_at    timestamptz default now()
);
-- RLS: user_id = auth.uid()
```

### `crm_proposal_options`
```sql
create table crm_proposal_options (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references crm_proposals(id) on delete cascade,
  insurer_name    text not null,                 -- "Porto Seguro"
  plan_name       text not null,                 -- "Intermediário"
  price_monthly   numeric(10,2),
  price_annual    numeric(10,2),
  deductible      text,                          -- "R$ 2.000"
  coverage_items  text[],                        -- lista de coberturas
  payment_terms   text,                          -- "50% entrada + 50% entrega"
  is_recommended  boolean default false,
  sort_order      int default 0
);
-- RLS: via join com crm_proposals onde user_id = auth.uid()
```

### `crm_proposal_events`
```sql
create table crm_proposal_events (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid not null references crm_proposals(id) on delete cascade,
  event_type    text not null,  -- view_started|view_ended|option_selected|accepted|rejected|reminder
  metadata      jsonb,          -- { option_id, duration_seconds, device }
  ip_hash       text,
  created_at    timestamptz default now()
);
-- RLS: INSERT público via RPC, SELECT apenas pelo dono (user_id do proposal)
```

### RPCs
- `get_proposal_by_token(p_token text)` — retorna proposta + opções + apólice anterior (se enable_comparison)
- `record_proposal_event(p_token text, p_event_type text, p_metadata jsonb)` — INSERT público
- `accept_proposal(p_token text, p_option_id uuid)` — marca aceite + move deal de stage

---

## 3. Extração do PDF — Estratégia Dupla

Para garantir a melhor experiência na extração dos dados do PDF, usaremos uma abordagem de duas camadas (fallback):

1. **OCR via IA (Primário):** Reutilizaremos a Edge Function `extract-quote-data` (já implementada em `QuoteUploadButton.tsx`) que usa IA para processar o PDF.
2. **Web File API + pdf.js (Fallback):** Se o OCR falhar ou retornar dados incompletos, o sistema entra em modo fallback client-side. Usaremos heurísticas simples para identificar padrões no texto extraído:

```
Padrão buscado no Fallback:
  - Linhas com valor em R$ → preço
  - Padrões como "PORTO SEGURO", "HDI", "ALLIANZ", "TOKIO" → seguradoras
  - Linhas com "cobertura", "RCF", "APP", "Assistência" → coberturas
  - Padrões como "Franquia R$" → franquia
```

**Resultado:** O corretor revisa o formulário pré-preenchido campo a campo antes de publicar. Um toast informa qual método (OCR ou Fallback Local) foi utilizado.

---

## 4. UI — Visão Corretor

### Interceptação no PolicyFormModal
Quando o usuário seleciona `Status = Orçamento` no passo 1 do `PolicyFormModal` e avança para a criação da apólice, o comportamento muda:
1. Uma apólice com status `Orçamento` é salva no banco (mantendo a retrocompatibilidade com listagens de Orçamento).
2. O modal atual fecha e o usuário é **redirecionado automaticamente** para o fluxo de "Criar Proposta Interativa" (o novo modal `DealProposalsTab`), com os dados do cliente e da apólice recém-criada pré-vinculados.

### Aba "Proposta" no DealDetailsModal ou Standalone

**Estado: sem proposta**
```
┌─────────────────────────────────────┐
│  📋 Criar Proposta Interativa        │
│                                     │
│  [📎 Fazer upload do PDF] ← dropzone│
│  ou preencher manualmente            │
└─────────────────────────────────────┘
```

**Estado: PDF carregado → formulário de revisão**
```
┌─────────────────────────────────────┐
│  Dados do Cliente (puxados do Deal) │
│  Nome: Ana Beatriz | Veículo: HB20  │
│                                     │
│  Validade: [data]                   │
│  Stage se aceitar: [dropdown]       │
│  Stage se recusar: [dropdown]       │
│  Comparativo c/ apólice: [toggle]   │
│                                     │
│  Opção 1: Porto Seguro / Intermediário │
│  ├─ Preço: R$ 280/mês               │
│  ├─ Franquia: R$ 2.000              │
│  └─ Coberturas: [tags editáveis]    │
│                                     │
│  Opção 2: HDI / Plus                │
│  ...                                │
│                                     │
│  [+ Adicionar opção]  [Publicar →]  │
└─────────────────────────────────────┘
```

**Estado: proposta publicada → analytics**
```
┌─────────────────────────────────────┐
│  🟢 Proposta enviada • 01/05/2026   │
│  Link: sgc.tork.com.br/p/abc123     │
│  [📋 Copiar] [WhatsApp ↗]           │
│                                     │
│  👁 12 views  ⏱ 4min 32s  🔥 Quente│
│                                     │
│  Timeline                           │
│  ✅ 30/abr 14:22 — Cliente visualizou│
│  🎯 30/abr 14:49 — Proposta Aceita! │
│     Opção escolhida: Porto Seguro   │
└─────────────────────────────────────┘
```

**Stitch MCP:** Gerar `DealProposalsTab.tsx` + `ProposalPDFImporter.tsx` + `ProposalAnalyticsDashboard.tsx`

---

## 5. UI — Visão Cliente (Pública)

**Rota:** `/p/:token` (sem ProtectedRoute, sem sessão)

**Stack visual:** Dark glassmorphism, gradiente azul/roxo, mobile-first (360px → desktop)

```
Mobile layout:
┌──────────────────────┐
│  🛡️ Tork CRM          │
│  Proposta de Seguro Auto │
│  Ana Beatriz · HB20 2022 │
├──────────────────────┤
│  ← scroll horizontal →  │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │Porto │ │ HDI  │ │Allianz│ │
│ │R$280 │★│R$310 │ │R$350 │ │
│ │/mês  │ │/mês  │ │/mês  │ │
│ └──────┘ └──────┘ └──────┘ │
├──────────────────────┤
│  [Comparar c/ apólice anterior] ← só se disponível │
├──────────────────────┤
│  Selecionada: Porto Seguro ✓  │
│  [✅ Aceitar esta opção]      │
│  [💬 Quero conversar]         │
│  [🔔 Me lembra depois]        │
├──────────────────────┤
│  Válida até 15/05/2026        │
│  Corretora JJ Amorim Seguros  │
└──────────────────────┘
```

**Overlay pós-aceite:**
```
🎉 Ótima escolha!
Você escolheu [Porto Seguro - Intermediário]
por R$ 280/mês.

Seu corretor já foi notificado e
entrará em contato em breve.
```

**Stitch MCP:** Gerar `ProposalView.tsx` (~350 linhas) + `ProposalComparativePanel.tsx`

---

## 6. Mapa de Dependências

```
Banco
  crm_proposals → crm_deals → clientes + crm_pipelines (stages)
  crm_proposal_options → crm_proposals
  crm_proposal_events → crm_proposals
  RPC accept_proposal → move deal stage (UPDATE crm_deals.stage_id)

Frontend CRM
  PolicyFormModal
    └── Redireciona para ProposalCreationModal se status === 'Orçamento'
  DealDetailsModal
    └── [NOVA] DealProposalsTab
          ├── ProposalPDFImporter (OCR Edge Function + pdfjs-dist fallback)
          └── ProposalAnalyticsDashboard
                └── ProposalTimeline (Supabase realtime)

Frontend Público
  App.tsx → /p/:token (sem auth)
    └── ProposalView
          ├── ProposalOptionCard × N
          └── ProposalComparativePanel (condicional)

Hooks novos
  src/hooks/useProposals.ts
    ├── useProposalByDeal(dealId)
    ├── useCreateProposal()
    ├── useUpdateProposal()
    ├── useProposalEvents(proposalId) — realtime
    └── usePublicProposal(token) — sem auth
```

---

## 7. WhatsApp — Texto Padrão Gerado

```
Olá {client_name}! 😊

Preparei a sua proposta de Seguro Auto para o {client_vehicle}.
Acesse pelo link abaixo, compare as opções e escolha a que
melhor se encaixa no seu bolso:

👉 {proposal_url}

Válida até {valid_until}.
Qualquer dúvida, pode chamar! 🙏
```

Botão abre: `https://wa.me/55{phone}?text={encoded_text}`
