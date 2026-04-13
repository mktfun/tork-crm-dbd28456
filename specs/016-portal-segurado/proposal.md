# Melhorias Portal do Segurado v2

## 1. Visão Geral
O usuário reportou 8 pontos de atrito no Portal do Segurado (versão web mobile/desktop e app Webview/Capacitor). O objetivo é refinar a experiência do segurado removendo bugs de interface, melhorando a assertividade do login, e agilizando a solicitação de demandas (onde dados já conhecidos devem vir preenchidos, e demandas específicas como Sinistro/Endosso devem ser atreladas às apólices do segurado e não apenas ao "Ramo").

## 2. Requisitos e User Stories

### 2.1 Bugs Críticos de UX
- **Editar Perfil Fechando Teclado:** Ao digitar em qualquer campo na tela de "Meus Dados", o teclado do celular fecha a cada caractere. 
  - *Causa:* O componente `ProfileRow` está sendo recriado a cada render porque está declarado dentro de `PortalProfile`.
- **Onboarding não atualiza dados:** Os dados fornecidos no 1º acesso (Onboarding) não refletem como esperado.
  - *Causa:* Validar a consistência do `sessionStorage` vs refetch do lado do cliente, e se a RPC `update_portal_profile` está salvando todos os campos pertinentes (como atualizar o nome caso aplicável, e formatar corretamente sem máscara no banco).
- **Login Falhando (Nome/CPF):** O Segurado tenta logar mas não acha o cadastro devido a divergências de string (espaços, caracteres especiais, máscaras de CPF).
  - *Causa:* A query no Supabase faz busca estrita. Precisamos limpar CPF na busca (apenas números) e usar `ILIKE` para busca por nome/email.

### 2.2 Requisitos Funcionais (Melhorias de Fluxo)
- **Auto-fill de Dados (Solicitações):** 
  - Ao iniciar Nova Cotação ou Renovação, os formulários do Wizard (Auto, Vida, etc) devem puxar automaticamente telefone, email, nome e CPF do segurado (usando os dados da sessão logada / cache).
  - Na renovação, pré-preencher com dados da apólice.
- **Sinistro e Endosso baseados em Apólices Ativas:**
  - O Wizard inicial do Portal (onde escolhe Auto, Residencial, etc.) deve mudar o comportamento para Endosso e Sinistro: ao invés de listar Ramos, deve listar "Suas Apólices Ativas" para o segurado selecionar. Assim a demanda já nasce atrelada à apólice certa.
- **Visualizar Solicitação (Inbox):**
  - O segurado deve poder abrir uma solicitação feita (na aba Solicitações do Portal) para ver os dados customizados que ele enviou no formulário (o payload do form salvo na demanda).
- **Botão WhatsApp Dinâmico (Ajuda):**
  - A página de ajuda (`PortalHome`) deve ter um botão direto para o WhatsApp da corretora (buscando da tabela `brokerage_settings` ou `corretoras`).
- **Hall de Entrada do App:**
  - O App Android (Webview) hoje abre na Landing Page (`/`). Vamos criar um "Hall" (`/app`) ou adaptar a rota principal para que, se não houver corretora selecionada no cache, mostre "Escolha sua corretora para acessar o Portal" em vez da LP de vendas do CRM.

## 3. O que JÁ EXISTE e será REUTILIZADO
- **Páginas:** `PortalProfile.tsx`, `PortalOnboarding.tsx`, `PortalLogin.tsx`, `PortalWizard.tsx`, `PortalSolicitacoes.tsx`.
- **RPCs:** `update_portal_profile` (será melhorada/revisada), funções de Auth customizado.
- **Componentes do Wizard:** `AutoWizard`, `ResidentialWizard`, etc. (serão alterados para receber `initialData`).

## 4. O que precisa ser CRIADO
- Componente `PolicySelector` no `PortalWizard.tsx` para listar apólices do cliente (tabela `policies`).
- Puxar o telefone do corretor na tabela correspondente.
- View `/app` simplificada ou adaptação da rota para abrir direto no hall do aplicativo.

## 5. Critérios de Aceite
- [ ] Editar Perfil no celular flui sem fechar teclado.
- [ ] Onboarding salva corretamente as informações no banco de dados da corretora.
- [ ] Login do segurado ignora pontuações no CPF e não tem case sensitivity.
- [ ] Formulários de Cotação vêm com dados de contato já preenchidos.
- [ ] Sinistro/Endosso mostram as apólices do cliente para seleção em vez de Ramos vazios.
- [ ] Botão de "Pedir Ajuda" redireciona via `wa.me` para o WhatsApp da corretora.
- [ ] Cliente consegue visualizar detalhes do pedido na tela "Solicitações" do portal.
