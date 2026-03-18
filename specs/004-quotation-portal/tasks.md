# Tasks: Portal de Cotações B2C Nativo (Spec 004)

## Escopo Único: Tork CRM

- [ ] **Banco de Dados (Migrations):**
  - Tabela `crm_portal_configs` (company_id, slug, logo_url, theme_color).
  - Tabela `crm_quotes` (company_id, name, phone, product_type, specifics, created_at).
- [ ] **Integração no Admin (Settings):**
  - Construir formulário em `/dashboard/solicitacoes-portal/admin` para o gestor preencher nome/slug/cores.
  - Implementar verificação de disponibilidade do `slug`.
- [ ] **Rota Pública do Portal:**
  - Criar roteamento `/quote/:slug` liberado sem necessidade de auth AuthGuard.
  - O Componente faz um fetch assíncrono buscando o `slug`. Se achar, pinta o layout local com a cor e a logo da corretora. Se não, exibe logo genérico do Tork.
  - Criar o `<form>` de captura de leads. Ao submeter, faz insert no `crm_quotes`.
- [ ] **Caixa de Entrada (Inbox) Atualizado:**
  - Injetar no layout do Inbox um botão ou aba para alternar de "Conversas" para "Cotações (Landing Page)".
  - A aba "Cotações" lista todos os dados vindos de `crm_quotes`, dando ao corretor a opção de acionar via Whatsapp.
