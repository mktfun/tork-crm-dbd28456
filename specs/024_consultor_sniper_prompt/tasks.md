# Checkout Tasks - Spec 024 (Consultor Sniper)

- [x] Editar `src/hooks/useAIConversations.ts` para ignorar Chunks de Whitespace do Watchdog e sanear sequências abusivas invisíveis. (JÁ FOI FEITO)
- [x] Editar `supabase/functions/admin-dispatcher/index.ts`.
- [x] No `admin-dispatcher/index.ts`, remover a diretriz rígida de "João Silva/Pai de família", os pedidos para listar 3 cotações de seguradoras (pois as ferramentas não existem), e o `SPIN Selling` prolongado.
- [x] Criar nova estrutura `pitch_structure` limpa, exigindo saídas como "Apólice [X] em Seguradora [X]" conforme solicitado.
- [x] Injetar `<restrictions>` rigorosa proibindo Chain of Thought, Emojis infantis e invenção de dados.
- [x] Realocar instrução RAG: Dizer para a IA buscar na base de conhecimento mas explicar de forma breve e enxuta para o corretor (sem exagerar no vocabulário técnico acadêmico).
