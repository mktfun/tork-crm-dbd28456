# Checklist Arquitetural v2 - Tork CRM

## 1. Introdução: A Visão do Tork CRM

O Tork CRM é um sistema de gestão completo para corretoras de seguros, projetado para ser um "All-in-One" que integra CRM, automação de marketing, gestão financeira e um portal do cliente. A arquitetura é baseada em React com Vite, Supabase como backend (banco de dados, autenticação, Edge Functions) e TailwindCSS para estilização.

**Este documento serve como um guia mestre para o desenvolvimento do sistema, detalhando as tarefas, a arquitetura e a metodologia de execução.**

## 2. Metodologia de Execução: O Ciclo Gemini-Lovable

O desenvolvimento está sendo feito em um ciclo iterativo com duas IAs:

1. **Gemini (Estrategista):** Gera os prompts técnicos com base no checklist e no feedback.
2. **Lovable (Implementador):** Executa os prompts, modificando o código.
3. **Manus (Revisor Técnico):** Analisa os prompts e o código gerado, garantindo qualidade e alinhamento com a arquitetura.

Este ciclo garante velocidade, qualidade e aprendizado contínuo.

## 3. Checklist de Tarefas

### Fase 1: Fundações e Correções Críticas (100% CONCLUÍDA)

- ✅ **Task 1.1:** Comissão automática na importação
- ✅ **Task 1.2:** Configurações do portal do cliente
- ✅ **Task 1.3:** Geração de carteirinha PDF
- ✅ **Task 1.4:** Sincronização de permissões no portal
- ✅ **Correções:** OCR, Login, URLs, Carteirinha

---

### Fase 2: Automação e Marketing (PENDENTE)

**Objetivo:** Construir os módulos de automação (estilo n8n) e marketing (estilo RD Station), além de aprimorar a IA e a qualidade do código.

- [ ] **Tarefa 2.1: Adotar o System Prompt Detalhado e o Modelo Híbrido de Contexto**
  > **Análise Arquitetural:** Enriquecer o assistente de IA com a persona e o conhecimento teórico do `amorim-ai`, sem sacrificar a busca de dados em tempo real.
  > **Caminho:** `supabase/functions/ai-assistant/index.ts` e `src/components/ai/AIAssistant.tsx`

- [ ] **Tarefa 2.2: Implementar "Perguntas Sugeridas" na Interface do Assistente**
  > **Análise Arquitetural:** Melhoria de UI/UX com baixo acoplamento, reutilizando componentes de `Button`.
  > **Caminho:** `src/components/ai/AIAssistant.tsx`

- [ ] **Tarefa 2.3: Adotar um Framework de Testes (Vitest)**
  > **Análise Arquitetural:** Mitigar riscos em futuras alterações, começando com testes unitários para a lógica de negócio.
  > **Caminho:** `vite.config.ts`, `vitest.setup.ts`, `src/services/commissionService.test.ts`

- [ ] **Tarefa 2.4: Estruturar o Módulo de Workflows (Backend e UI)**
  > **Análise Arquitetural:** Criar a fundação do novo módulo, com tabelas para armazenar workflows e uma nova página de dashboard.
  > **Caminho:** Nova migração SQL, `src/pages/Workflows.tsx`

- [ ] **Tarefa 2.5: Desenvolver a Interface Visual de Criação (Canvas com React Flow)**
  > **Análise Arquitetural:** Usar `React Flow` para criar um canvas de nós e arestas, com comunicação gerenciada por estado local.
  > **Caminho:** `src/components/workflows/WorkflowEditor.tsx`

- [ ] **Tarefa 2.6: Criar o Motor de Execução de Workflows**
  > **Análise Arquitetural:** Edge Function desacoplada que lê a definição do workflow e executa as ações.
  > **Caminho:** `supabase/functions/workflow-engine/index.ts`

- [ ] **Tarefa 2.7: Estruturar o Módulo de Marketing e Configurações**
  > **Análise Arquitetural:** Criar o esqueleto do novo módulo, com página principal e sub-página de configurações.
  > **Caminho:** `src/pages/MarketingDashboard.tsx`, `src/pages/settings/MarketingSettings.tsx`

- [ ] **Tarefa 2.8: Desenvolver o Módulo de Email Marketing (Editor e Campanhas)**
  > **Análise Arquitetural:** Usar `react-email` ou `mjml-react` para criar um editor visual de emails, com segmentação de público.
  > **Caminho:** `src/pages/marketing/EmailCampaigns.tsx`, `src/pages/marketing/CreateEmailCampaign.tsx`

- [ ] **Tarefa 2.9: Implementar a Integração com Plataformas de Anúncios**
  > **Análise Arquitetural:** Integração segura com OAuth2 e webhook para receber leads.
  > **Caminho:** `MarketingSettings.tsx`, `supabase/functions/ads-webhook/index.ts`

---

**Aguardando sinal verde para iniciar a Fase 2.**
