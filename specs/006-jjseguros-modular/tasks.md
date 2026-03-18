# Tasks: Modularização do JJ Seguros e UI

## Parte 1: Limpeza da UI
- [ ] Editar `src/layouts/SettingsLayout.tsx`:
  - Remover as tabs: "Produtos", "Chat", "Portal".
  - Manter: "Perfil", "Corretoras", "Produtores", "Seguradoras", "Ramos".
- [ ] Adicionar "Produtos" ao menu lateral principal (Sidebar) do App.

## Parte 2: O Novo Inbox Modular (`/solicitacoes-portal`)
- [ ] Refatorar `PortalInbox.tsx` para usar o componente `<Tabs>` com as seguintes opções:
  - `Solicitações`: Renderiza a tela original que já existe das apólices e usuários do aplicativo.
  - `Admin`: Renderizará o Painel Web (Dashboard Analítico e listagem de Leads do JJSeguros).
  - `Portal`: Renderizará as configurações de exibição (Antigo `PortalSettings` que estava na tela de settings).

## Parte 3: Portabilidade Física do JJ Seguros
- [ ] Criar diretório `src/modules/quotations/` para isolar a feature.
- [ ] Copiar componentes vitais do repositório JJSeguros para cá (Hero, Form, Layouts).
- [ ] Adaptar a tipagem e os hooks de banco de dados para a API e o schema do Tork CRM (Supabase client unificado).

## Parte 4: Linkagem e Mapeamento de Domínio
- [ ] Criar a rota limpa `/quote/:slug` no `App.tsx` chamando a home do módulo de Quotes.
- [ ] Criar botão de disparo "Ver Dashboard Admin" ou similar se o usuário quiser visualizar em tela cheia na parte restrita.
