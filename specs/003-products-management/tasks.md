# Tasks: Gerenciamento de Produtos (Ramos)

## Etapa 1: Banco de Dados e Backend (Supabase MCP)
- [ ] Mapeamento Inicial: Rodar `list_tables` para verificar se já existe uma tabela residual `crm_products` ou similar.
- [ ] Criação de Tabela: Criar migration para adicionar `crm_products`.
  - Colunas sugeridas: `id` (uuid), `company_id` (uuid), `name` (text), `description` (text, opcional), `is_active` (boolean, default true), `created_at`.
- [ ] RLS (Row Level Security): Garantir que a policy restringe acesso apenas para quem tem o mesmo `company_id`.
- [ ] Atualização em `crm_deals`: Adicionar coluna opcional `product_id` em `crm_deals` referenciando `crm_products(id)`.
- [ ] Geração de Tipos: Após fazer os pushs db, rodar sync dos tipos Typescript para `src/types/database.types.ts`.

## Etapa 2: Estrutura Base e Primitivos Frontend (Antigravity/Stitch)
- [ ] Verificar componentes existentes (`grep_search` em `src/components/ui` e `src/hooks`). Existe alguma variação de tableta padronizada?
- [ ] Tela de Configuração UI (`ProductsSettings.tsx`): Criar a página de configuração, idealmente aninhada nas chamadas do layout de settings atual (ver App.tsx).
- [ ] Módulos do CRUD Visual:
  - Header estilizado.
  - Tabela (Grid ou Shadcn DataTable) listando os produtos.
  - Componente de `<ProductDialog>` para Add/Edit.
- [ ] Integração (Hooks): Criar/Atualizar hook (ex: `useProducts.ts`) para lidar com fetch, insert e update da tabela usando Supabase Client.

## Etapa 3: Integração no Cadastro
- [ ] Criar a rotina Seed/Default: Garantir que corretoras atuais recebam produtos padrões (Auto, Vida, Fiança, Residencial, Consórcio) via migration de dados ou script de migração.

## Etapa 4: Auditoria UX e Lint
- [ ] Consertar Lints e Tipagens (Zero ANYs).
- [ ] Passar revisão visual para alinhar com Padrões Premium.
