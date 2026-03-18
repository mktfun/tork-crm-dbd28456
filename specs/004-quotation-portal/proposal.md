# Proposal: Módulo Nativo de Cotações B2C (Spec 004)

## 1. Contexto e Problema
A ideia original de manter um repositório isolado (`jjseguros`) para funcionar como landing page das corretoras gera fricção de manutenção técnica. O usuário determinou que a Landing Page de Cotações (B2C) deve ser internalizada em nosso próprio CRM (Tork CRM). 

## 2. Nova Arquitetura de Domínio (Internalizada)
O Tork CRM passará a hospedar rotas públicas.
- Rota: `https://app.tork.services/quote/[slug-da-corretora]`
- O frontend extrai o `[slug]`, consulta o banco público e monta a página de Cotação personalizada dinamicamente (com as cores e logo da corretora referida).
- O cliente final não vê o painel do Tork, vê apenas a Landing Page. Se desejar, terá um botão "Entrar no Portal do Cliente".

## 3. Gestão Administrativa e Operacional
- **Configurações**: O corretor entra em `/dashboard/solicitacoes-portal/admin` e preenche seu `slug` desejado, suas cores e seus logos.
- **Caixa de Entrada (Inbox)**: Quando o cliente final preenche o formulário de orçamentos no `/quote/:slug`, isso gera um "Lead de Cotação". Na tela de Inbox do CRM, haverá uma aba secundária "Portal de Cotações" para o corretor gerenciar e iniciar o atendimento direto com esse cliente novo.

## 4. Escopo Técnico
- **Supabase**: Criação da tabela `crm_portal_configs` (configurações do visual) e `crm_quotes` (os leads gerados pela landing page).
- **React Router**: Rota pública dinâmica `/quote/:slug` protegida contra layouts administrativos.
- **UI Admin**: Abas no Settings e Abas secundárias no Inbox do sistema atual.
