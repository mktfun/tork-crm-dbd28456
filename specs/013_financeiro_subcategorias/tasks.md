# Tasks: Gap de Março e Subcategorias

- [ ] **Fase 1: Fix Gap Março (DB/Backend)**
  - [ ] Executar script diagnóstico na DB para mapear os entries de Março de 2026.
  - [ ] Identificar anomalia (flags incorretas, ausência de \`bank_account_id\`, ou bug real na query de paginação).
  - [ ] Aplicar fix ou migration corretiva caso seja base de dados ou query (Supabase MCP).

- [ ] **Fase 2: UI Criação/Edição de Subcategoria**
  - [ ] Localizar modal de "Criar Categoria" no portal (\`src/components/financeiro/\` possivelmente em Configurações).
  - [ ] Adicionar campo de seleção "Categoria Mãe" (filtrando apenas accounts válidas).
  - [ ] Atualizar hook de mutation para enviar o payload com \`parentId\`.

- [ ] **Fase 3: Rendering na Tabela de Plano de Contas**
  - [ ] Atualizar visualização do plano de contas para criar a subárvore.
  - [ ] Ordenar lista: Parent -> Childs -> Parent 2 -> Childs...

- [ ] **Fase 4: Integração nos Seletores de Transação**
  - [ ] Modificar \`NovaDespesaModal.tsx\` e \`NovaReceitaModal.tsx\` para suportar renderização agrupada de categorias.
