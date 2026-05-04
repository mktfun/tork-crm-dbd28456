# Tasks: 053 — Propostas Interativas
> Sequência de execução para /vibe-apply 053

---

## Fase 1 — Backend (Supabase MCP)

- [ ] **1.1** `supabase migration new create_crm_proposals` — criar tabela `crm_proposals` com RLS (user_id = auth.uid())
- [ ] **1.2** `supabase migration new create_crm_proposal_options` — criar tabela `crm_proposal_options` com RLS
- [ ] **1.3** `supabase migration new create_crm_proposal_events` — criar tabela pública para analytics (INSERT sem auth via RPC)
- [ ] **1.4** Criar RPC `get_proposal_by_token(p_token text)`:
  - Retorna proposta + opções + dados do cliente
  - Se `enable_comparison = true`, inclui apólice anterior do mesmo ramo
- [ ] **1.5** Criar RPC `record_proposal_event(p_token, p_event_type, p_metadata)`:
  - INSERT público (security definer), valida token existe
- [ ] **1.6** Criar RPC `accept_proposal(p_token, p_option_id)`:
  - Atualiza `crm_proposals.status = 'accepted'`, `accepted_option_id`, `accepted_at`
  - Atualiza `crm_deals.stage_id = proposals.accepted_stage_id`
- [ ] **1.7** `supabase gen types typescript --local > src/types/database.types.ts`

---

## Fase 2 — Hooks & Serviços

- [ ] **2.1** Criar `src/hooks/useProposals.ts` com:
  - `useProposalByDeal(dealId)` — busca proposta existente
  - `useCreateProposal()` — mutation de criação
  - `useUpdateProposal()` — mutation de edição/publicação
  - `useProposalEvents(proposalId)` — query + realtime subscription
  - `usePublicProposal(token)` — query pública (sem auth) via RPC
  - `useAcceptProposal()` — chama RPC de aceite

---

## Fase 3 — PDF Parser (OCR + Fallback)

- [ ] **3.1** Instalar `pdfjs-dist`: `npm install pdfjs-dist`
- [ ] **3.2** Reutilizar a chamada de `extract-quote-data` (OCR via Edge Function) já existente em `QuoteUploadButton.tsx`
- [ ] **3.3** Criar `src/lib/pdfProposalParser.ts` para o fallback client-side:
  - `parsePDFLocalFallback(file: File): Promise<ParsedProposal>` 
  - Extrai texto, identifica seguradoras, planos, preços, coberturas e franquias
- [ ] **3.4** Criar orquestrador de extração: tenta o OCR primeiro; se falhar/vazio, chama o fallback. Dispara toast indicando o método que obteve sucesso.

---

## Fase 4 — UI Corretor (dentro de DealDetailsModal)

- [ ] **4.1** Interceptar criação de Orçamento em `PolicyFormModal.tsx`:
  - Ao salvar com `status = 'Orçamento'`, chamar `onClose` e abrir o fluxo de Proposta Interativa automaticamente (via context ou state management).

- [ ] **4.2** Criar `src/components/crm/proposals/ProposalPDFImporter.tsx` (Stitch MCP):
  - Dropzone de upload do PDF integrado com a estratégia dupla (OCR + Fallback)
  - Preview das opções extraídas em cards editáveis
  - Campos: seguradora, plano, preço, coberturas (tags), franquia
  - Botão "Adicionar opção manual" (até 3)

- [ ] **4.3** Criar `src/components/crm/proposals/ProposalSettingsForm.tsx`:
  - Campos: título, validade, stage_aceite (dropdown), stage_recusa (dropdown)
  - Toggle "Habilitar comparativo com apólice anterior" (só aparece se cliente tiver apólice no mesmo ramo)

- [ ] **4.4** Criar `src/components/crm/proposals/ProposalTimeline.tsx`:
  - Lista de eventos com ícones e timestamps
  - Subscription realtime nos `crm_proposal_events`

- [ ] **4.5** Criar `src/components/crm/proposals/ProposalAnalyticsDashboard.tsx` (Stitch MCP):
  - Banner com link + botões "Copiar" e "WhatsApp"
  - KPI Cards: 👁 Views | ⏱ Tempo médio | 🔥 Termômetro | 📅 Enviada
  - `<ProposalTimeline />`

- [ ] **4.6** Criar `src/components/crm/proposals/DealProposalsTab.tsx`:
  - Orquestra: se `!proposal` → mostra importer. Se `proposal.status === 'draft'` → mostra form. Else → Analytics.
  - Pode ser injetado no `DealDetailsModal` e também renderizado em um modal standalone quando chamado via `PolicyFormModal`.

---

## Fase 5 — Página Pública do Cliente (Stitch MCP)

- [ ] **5.1** Adicionar rota pública em `src/App.tsx`:
  ```tsx
  <Route path="/p/:token" element={<ProposalView />} />
  ```
  (fora do ProtectedRoute)

- [ ] **5.2** Criar `src/pages/public/ProposalView.tsx` (Stitch MCP — ~350 linhas):
  - Sem autenticação, carrega proposta via RPC `get_proposal_by_token`
  - Header: logo + nome do cliente + veículo
  - Cards de opções (scroll horizontal mobile, grade no desktop)
  - Seleção de opção → ativa botão de aceite
  - Botões: ✅ Aceitar | 💬 Quero conversar | 🔔 Me lembra
  - Footer: validade + rodapé da corretora

- [ ] **5.3** Criar `src/pages/public/ProposalComparativePanel.tsx`:
  - Exibe tabela comparativa: apólice atual vs. opção selecionada
  - Aparece via toggle só se `proposal.enable_comparison && previousPolicy`

- [ ] **5.4** Gravar evento `view_started` no `useEffect` de mount da página
- [ ] **5.5** Gravar evento `view_ended` no `beforeunload` com `duration_seconds`
- [ ] **5.6** Gravar evento `option_selected` ao trocar a opção ativa
- [ ] **5.7** Ao aceitar: chamar `accept_proposal`, exibir overlay de confirmação

---

## Fase 6 — WhatsApp Manual

- [ ] **6.1** Criar função utilitária `src/lib/buildWhatsAppLink(proposal, phone)`:
  - Gera texto padrão com link da proposta
  - Retorna `wa.me` URL encode
- [ ] **6.2** Botão "Enviar WhatsApp" no `ProposalAnalyticsDashboard` usa essa função

---

## Fase 7 — Qualidade & Entrega

- [ ] **7.1** Build limpo: `npm run build`
- [ ] **7.2** Testar fluxo completo: upload PDF → revisão → publicar → link → aceite → stage movido
- [ ] **7.3** Validar RLS: token aleatório não acessa dados de outro usuário
- [ ] **7.4** Testar responsividade em 360px (mobile mínimo)
- [ ] **7.5** Commit semântico: `feat(proposals): add interactive proposal module with PDF import and public view`
- [ ] **7.6** Push: `git push origin master:main && git push lovable master:main`

---

## Estimativas
| Fase | Responsável | Tempo |
|---|---|---|
| 1 — Backend | Supabase MCP | ~2h |
| 2 — Hooks | Antigravity | ~1h |
| 3 — PDF Parser | Antigravity | ~1.5h |
| 4 — UI Corretor | Stitch + Antigravity | ~3h |
| 5 — Página Pública | Stitch + Antigravity | ~3h |
| 6 — WhatsApp | Antigravity | ~30min |
| 7 — Qualidade | Antigravity | ~1h |
| **Total** | | **~12h** |
