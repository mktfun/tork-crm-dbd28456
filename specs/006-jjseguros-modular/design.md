# Design: Modularização do JJ Seguros e Reestruturação de UI

## 1. O Menu Principal do CRM (Sidebar Operacional)
- A tela de "Produtos" (recentemente criada) será **promovida** a um item de menu principal de primeiro nível, saindo de dentro de Configurações, pois Produtos são entidades de uso contínuo (como Apólices e Clientes). 
- O menu de Configurações (Settings) será "emagrecido" contendo apenas entidades núcleo: Perfil, Corretoras, Produtores, Seguradoras, Ramos. 
- A aba "Chat Tork" de settings será removida, centralizando tudo na tela dedicada de Automações de IA.

## 2. O Painel Triplo: `/dashboard/solicitacoes-portal`
A atual página de "Inbox do Portal" passará a comandar 3 dimensões através de um design de Tabs (Radix UI):
1. **[Tab] Solicitações**: O container listando tickets antigos/atuais de abertura do portal de cliente existente (Mantido como estava).
2. **[Tab] Admin (Cotações)**: Recebe **integralmente** a UI de administração do Cotações do `jjseguros`. Uma tabela focada em leads quentes que chegaram publicamente.
3. **[Tab] Portal**: Recebe os cards de configuração de URL (`PortalSettings` e Link Dinâmico) que retiramos do menu engessado de settings.

## 3. A Landing Page Pública (O Módulo Cotações)
- Todo o framework front-end da pasta `jjseguros` será migrado fisicamente para `src/modules/quotations/`.
- A rota `/quote/:slug` renderizará o componente raíz da Landing Page migrada.
- Ele consumirá a política de Theaming (cores dinâmicas via slug) descrita nos requests anteriores, mas mantendo a cara idêntica ao jjseguros que o Admin aprova.
