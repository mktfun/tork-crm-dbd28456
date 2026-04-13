---
description: Levantar requisitos e criar uma Master Spec guiada por Spec-Kit sem escrever código.
---

<!-- OPENSPEC:START -->

**Guardrails**

- NÃO escreva código nesta fase. Seu objetivo é apenas gerar documentação de planejamento.
- Pergunte ao usuário sobre regras de negócios ou design (caso não fornecido) antes de fechar o spec.
- Siga as regras de `.antigravity/rules.md` para garantir que o software seja arquitetado para as abstrações do ecossistema (Stitch para UI, Supabase para DB).

**Steps**

0. **Fase Research (RPI-R) — Pesquisa e Contexto:**
   - Mapeie os arquivos existentes do projeto, leia dependências e garanta 100% de clareza do escopo.
   - Scrape o site atual do cliente (se existir) com Firecrawl para extrair branding (cores, fontes, tom de voz).
   - Analise no mínimo 2 concorrentes diretos para benchmarking visual e funcional.
   - Documente todos os achados em `specs/<id>/research.md`.
   - **Regra de Ouro:** Nunca saia escrevendo código em um único prompt gigante; quebre o trabalho em subplanos verificáveis.
1. Crie ou identifique o ID da funcionalidade (ex: `001-auth`).
2. Avalie o contexto atual do projeto, analise pedidos do usuário e identifique lacunas.
3. Crie `specs/<id>/proposal.md` detalhando os Requisitos, User Stories, Critérios de Aceite e obrigatoriamente uma seção **`## BDD Scenarios`** com cenários no formato:
   ```
   ### Cenário: [Nome descritivo]
   - **Given (Dado):** [contexto/estado inicial do sistema]
   - **When (Quando):** [ação realizada pelo usuário]
   - **Then (Então):** [resultado esperado mensurável]
   ```
   Esses cenários servem como fonte da verdade para validação — teste comportamento real, não trivialidades.
4. Crie `specs/<id>/design.md` onde você explicará como a UI será dividida para o **Stitch MCP** e como o banco de dados será modelado para o **Supabase MCP**. Consulte a skill `ux-ui-architect-2026` para garantir que o design segue as tendências visuais 2026 (Liquid Glass, Maximalismo, WCAG 2.2).
5. Crie `specs/<id>/tasks.md` contendo um checklist estrito e sequencial de tarefas granulares que o agente deverá cumprir na fase de implementação.
6. Valide a coerência dos documentos e peça aprovação do usuário usando a tool `notify_user` antes de encerrar.

**Reference**

- Baseie os componentes de UI em Shadcn UI.
- Baseie as decisões de backend em PostgreSQL (via Supabase).
- Consulte a skill `ux-ui-architect-2026` ao definir paletas, tipografia e padrões visuais no `design.md`.
<!-- OPENSPEC:END -->
