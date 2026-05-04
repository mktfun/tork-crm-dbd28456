# Master Spec: 053_propostas_interativas
> Versão refinada com clarificações do usuário — 04/05/2026

## 1. Visão Geral

O Módulo de Propostas Interativas transforma o fluxo atual de orçamentos (PDF enviado por WhatsApp) em uma experiência web dinâmica, mobile-first e rastreável. O corretor faz upload do PDF de orçamento de um Deal existente. O sistema extrai as opções (até 3 seguradoras). Um link único é gerado, compartilhado via WhatsApp. O cliente visualiza, compara e decide — e o Deal no CRM avança automaticamente conforme a resposta.

---

## 2. User Stories Priorizadas

| # | Story | Prioridade |
|---|---|---|
| US01 | Como corretor, faço upload do PDF de cotação Auto dentro do Deal no Kanban | Alta |
| US02 | Como corretor, confiro/ajusto as opções extraídas do PDF e gero o link da proposta | Alta |
| US03 | Como corretor, copio o link ou abro o WhatsApp nativo com o texto já preenchido (sem automação) | Alta |
| US04 | Como cliente, abro o link no celular, vejo as opções comparadas e clico em "Aceitar" | Alta |
| US05 | Como sistema, ao aceitar: o Deal é movido para um stage definido pelo corretor (ex: "Proposta Aceita") | Alta |
| US09 | Como corretor, ao criar uma nova apólice com status "Orçamento" no `PolicyFormModal`, sou redirecionado para a nova experiência de Proposta Interativa (não o form padrão) | Alta |
| US10 | Como sistema, ao cliente aceitar a proposta via link, o status é automaticamente promovido de `Orçamento` para `Ativa` no banco de apólices | Alta |
| US06 | Como sistema, ao recusar/ignorar: o corretor pode mover manualmente ou o sistema move para stage configurado | Média |
| US07 | Como corretor, vejo métricas da proposta: Views, Tempo Leitura, Termômetro | Média |
| US08 | Como corretor, se o cliente tiver apólice anterior do mesmo ramo, posso ativar comparativo | Baixa (Opcional) |

---

## 3. Clarificações de Negócio

### 3.1 Importação do PDF — Estratégia Dupla
- O corretor faz **upload do PDF** de orçamento (ex: "Orçamento Seguro Auto - Ana Beatriz.pdf")
- **1ª tentativa — OCR (primary):** Envio para Edge Function Supabase que usa a API `extract-quote-data` já existente (OCR via IA). `QuoteUploadButton.tsx` já implementa esse fluxo.
- **2ª tentativa — pdfjs-dist (fallback):** Se o OCR retornar erro ou dados vazios, o sistema automaticamente tenta extração client-side com `pdfjs-dist` + heurísticas de texto.
- O corretor **revisa e ajusta** antes de publicar — nunca publica direto sem confirmação
- Campos mínimos por opção: `Seguradora`, `Plano`, `Preço mensal`, `Coberturas (lista)`, `Franquia`
- Toast informativo ao usuário indica qual método foi usado ("Dados extraídos via OCR" ou "Extração local usada como fallback")

### 3.2 Regras de CRM (Stages)
- **Ao cliente aceitar:** Deal move para stage `accepted_stage_id` — configurado por proposta pelo corretor (dropdown de stages do pipeline)
- **Ao cliente recusar:** Deal move para stage `rejected_stage_id` — também configurável
- Os stages não são hardcoded; o corretor escolhe no formulário de criação da proposta

### 3.2b Integração com PolicyFormModal
- O `PolicyFormModal` atual já tem o pill de status **"Orçamento"** no Step 1
- Quando o corretor seleciona `status = 'Orçamento'` e clica em **"Criar Apólice"**, em vez de criar uma apólice simples, o sistema:
  1. Cria um registro de apólice com `status = 'Orçamento'` (mantém compatibilidade)
  2. Abre imediatamente o **modal de Proposta Interativa** (`DealProposalsTab` em Dialog) com os dados do cliente pré-preenchidos
- Quando o cliente **aceita via link público**, o sistema:
  1. Atualiza `crm_proposals.status = 'accepted'`
  2. Atualiza a **apólice vinculada** de `status = 'Orçamento'` para `status = 'Ativa'`
  3. Move o Deal para o stage configurado
- Isso respeita todo o fluxo existente de `BudgetConversionModal.tsx` e `usePolicyActions.ts`

### 3.3 WhatsApp — Fase Atual (Manual)
- Botão **"Copiar Link"** — copia URL pública para clipboard
- Botão **"Enviar via WhatsApp"** — abre `https://wa.me/{phone}?text=...` com o link e texto pré-montado
- **NÃO** dispara automação Chatwoot agora. Chatwoot fica reservado para fase futura

### 3.4 Dados do Cliente
- Nome, telefone e veículo são puxados automaticamente do Deal + Cliente vinculado ao Deal
- Zero redigitação pelo corretor

### 3.5 Comparativo com Apólice Anterior (Opcional)
- Botão "Mostrar comparativo" aparece na página do cliente **SOMENTE SE:**
  1. O cliente (mesmo `client_id`) tiver uma apólice ativa no banco com o mesmo `ramo` (ex: Auto)
  2. O corretor ativou o toggle "Habilitar comparativo" ao criar a proposta
- Se disponível: mostra card extra com cobertura/valor da apólice antiga vs. nova opção selecionada

---

## 4. O que JÁ EXISTE e será REUTILIZADO

| Recurso | Arquivo | Como será usado |
|---|---|---|
| `crm_deals` | Banco | Proposta é filha de um Deal |
| `crm_pipelines` / stages | Banco | Para listar e selecionar stages de aceite/recusa |
| `clientes` / `policies` | Banco | Dados do cliente e apólice anterior |
| `DealDetailsModal.tsx` | `src/components/crm/` | Nova aba "Proposta" injetada aqui |
| `ChatTorkSettings` / Chatwoot config | `src/pages/settings/` | Link com WhatsApp, futura automação |
| Shadcn UI (Card, Badge, Button, Tabs, Dialog) | `src/components/ui/` | Toda a UI nova |

---

## 5. O que precisa ser CRIADO

### Backend
- `crm_proposals` — tabela principal (token único, status, stages de destino)
- `crm_proposal_options` — até 3 opções por proposta (dados da cotação)
- `crm_proposal_events` — analytics (views, cliques, aceites)
- RPC `get_proposal_by_token` — acesso público via token
- RPC `record_proposal_event` — INSERT público (analytics)
- RPC `accept_proposal` — aceita + move deal de stage

### Frontend — Visão Corretor
- `DealProposalsTab.tsx` — aba de proposta dentro do DealDetailsModal
- `ProposalPDFImporter.tsx` — upload + extração + formulário de revisão
- `ProposalAnalyticsDashboard.tsx` — KPIs + Timeline

### Frontend — Visão Cliente (Pública)
- Rota `/p/:token` (sem ProtectedRoute)
- `ProposalView.tsx` — página mobile-first, dark, comparador de opções
- `ProposalComparativePanel.tsx` — painel opcional de comparativo com apólice anterior

---

## 6. Critérios de Aceite

1. ✅ Upload de PDF funciona; sistema extrai e pré-preenche as opções
2. ✅ Corretor revisa e publica com 1 clique
3. ✅ Link gerado é único, público, sem login e abre em < 1s no mobile
4. ✅ Ao aceitar: Deal avança para o stage configurado
5. ✅ Analytics (views, tempo) aparecem em tempo real no CRM
6. ✅ Comparativo só aparece se condições forem atendidas (apólice + toggle ativo)
