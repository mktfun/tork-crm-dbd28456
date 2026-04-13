---
description: Implementar uma especificação aprovada orquestrando Stitch MCP, Supabase MCP e Antigravity.
---

<!-- OPENSPEC:START -->

**Guardrails**

- Só inicie se houver um diretório `specs/<id>/` válido e aprovado.
- Priorize delegar tarefas de geração de UI pesada para as ferramentas adequadas (Stitch/Lovable) em vez de escrever HTML/CSS do zero.
- Siga rigorosamente o checklist em `specs/<id>/tasks.md`.

**Steps**

1. Leia a master spec: `proposal.md`, `design.md` e `tasks.md` do diretório `specs/<id>/`.
1.5. **Validação de Contexto (RPI-R) — Research Pré-Implementação:**
   - Mapeie TODOS os arquivos existentes do projeto antes de escrever qualquer código.
   - Verifique se as dependências (pacotes, APIs, DBs) declaradas na spec ainda são válidas.
   - Cross-reference o `design.md` com a skill `ux-ui-architect-2026` para garantir conformidade 2026.
   - Se o spec tem mais de 7 dias, pergunte ao usuário se houve mudanças de escopo.
   - **Regra de Ouro:** Nunca saia escrevendo código em um único prompt gigante; quebre o trabalho em subplanos verificáveis.
2. **Fase de Frontend (Stitch/Lovable):**
   - Se o design envolve novas interfaces, utilize a skill `design-md` do Stitch para documentar o sistema de design a partir da spec.
   - Use `stitch-loop` ou peça para o usuário gerar a base visual no Lovable.
3. **Fase de Backend (Supabase):**
   - Analise o `design.md` e crie as migrações SQL necessárias (`supabase migration new <nome>`).
   - Implemente tabelas, restrições e políticas de RLS.
   - Rode `supabase gen types typescript --local` para atualizar as tipagens da aplicação.
4. **Fase de Integração (Antigravity):**
   - Escreva o código-cola: conecte a UI gerada (Fase 2) com o backend tipado (Fase 3).
   - Resolva lintings e garanta tratamento de erros elegante.
5. Marque progressivamente os itens do `tasks.md` como `- [x]` conforme for concluindo as fases.
5.5. **Quality Gate de Frontend (UX/UI 2026):**
   - Invoque mentalmente a skill `ux-ui-architect-2026` e revise TODO o código HTML/CSS/Tailwind gerado.
   - **Checklist obrigatório antes do commit:**
     - [ ] Interface possui características de **Apple Liquid Glass** (profundidade orgânica, desfoque dinâmico, materiais translúcidos)
     - [ ] Aplica **Maximalismo Tátil** em páginas de conversão (tipografia expressiva 4xl+, cores vibrantes dopamínicas, alto contraste)
     - [ ] Cumpre **WCAG 2.2** (`:focus-visible` de alto contraste, alvos de clique mínimos 24x24px, sem overlays obstruindo foco)
     - [ ] Contém **Microinterações e Motion Design** (hover effects, scroll triggers, transições suaves de entrada)
     - [ ] Sombras multicamadas (não `shadow-lg` genérico), bordas reflexivas, cores curadas (HSL harmonizadas)
6. Ao finalizar todas as tarefas, valide se o código está funcionando (build/testes) e notifique o usuário da conclusão.

**Reference**

- Não sobrescreva componentes do Stitch sem necessidade. Crie wrappers/hooks em volta deles.
- Mantenha os Edge Functions do Supabase em `supabase/functions/` se necessário.
- A skill `ux-ui-architect-2026` é o quality gate final de toda interface gerada.
<!-- OPENSPEC:END -->
