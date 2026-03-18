# Design: Portal Nativo de Cotações

## 1. Landing Page B2C (`/quote/:slug`)
A página onde o cliente final vai cair precisa ser esteticamente inspirada no layout da `jjseguros` mas focada 100% em ser B2B2C.
- **Visual**: Fundo limpo, Header com a logo da corretora e um botão "Portal do Cliente".
- **Hero Section**: Formulário focado em conversão ('Faça sua cotação rápida').
- **Theming**: Injeção da cor HEX `theme_color` nas raízes do Tailwind no momento em que a página carrega.
  
## 2. Teller UI (Inbox Secundário)
Na tela principal de operação (Inbox), hoje focada nos chats, adicionaremos um segment filter ou "Aba Secundária" no cabeçalho ou menu esquerdo:
- **Aba Chat / WhatsApp**: Atual.
- **Aba Cotações Geradas**: Lista estilo kanban simplificado ou tabela das intenções submetidas via Landing Page. Cada card tem as info de contato, ramo desejado e botões rápidos: "Chamar no WhatsApp" ou "Converter em Negócio" (Deal).

## 3. Tela de Configuração (Settings)
Na página de configurações administratrativa dedicada em `/dashboard/solicitacoes-portal/admin`:
- Campo `Slug do Portal`: Checa se já existe no onBlur.
- Color Picker Moderno.
- Upload de Avatar/Logo.
- Painel "Link Público": O administrador acessa rapidamente a URL do seu portal com um botão de cópia ("Copy to clipboard").
