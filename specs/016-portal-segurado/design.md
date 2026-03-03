# Design e Arquitetura: Portal do Segurado v2

## 1. Alterações de Base de Dados (Supabase)
### 1.1 `update_portal_profile` (RPC)
A RPC atual usa `p_new_data->>'campo'` que não funciona bem quando o valor de texto não existe (retorna `null` no JSON, sobreescrevendo com vazio) ou o JSON é gerado pelo front com mascaras parciais de telefone e sem atualizar o próprio cache no state manager real da aplicação.
- **Mudança:** Garantir parsing robusto para nome e dados e retornar os dados atualizados também para o frontend forçar o re-render. Evitaremos migrar a RPC inteira se não for necessário; em vez disso, limparemos rigorosamente o objeto JSON enviado pelo Frontend (`PortalOnboarding`).

### 1.2 View de Apólices Ativas
Para Endosso e Sinistro, o cliente deverá selecionar sua apólice.
- A tabela `policies` será consultada: `SELECT * FROM policies WHERE client_id = X AND status = 'Ativa'`. Nenhuma modelagem nova necessária; já existente.

## 2. Alterações de UI (Frontend / Antigravity)

### 2.1 Teclado Fechando (`PortalProfile.tsx`)
- O componente `ProfileRow` foi declarado DENTRO do corpo de `PortalProfile`. 
- **Solução:** Mover a função `ProfileRow` para **fora** do componente principal ou torná-la um elemento JSX estático para que o React Reconciliation não destrua e recrie o nó do DOM, mantendo o foco do input.

### 2.2 Login (Nome/CPF) (`PortalLogin.tsx`)
- O usuário reclama que os dados as vezes não batem.
- A busca hoje:
  - Formata CPF no input e checa `cpf_cnpj`.
  - Checa `name ILIKE p_name`.
- **Solução:** Remover pontos/traços do input, aplicar um fuzzy search leve (`ILIKE '%nome%'`) ou ignorar acentos/capitalização na string enviada para a API/Supabase. 

### 2.3 PortalWizard.tsx e Solicitacoes
- Ao clicar em "Nova Cotação" a partir da Home do Portal, passaremos os dados atuais do `client` (que está no Local/Session Storage via `user_id`) como `initialData` para o formulário. O `AutoWizard` (e outros) será modificado para aceitar `defaultValues: { phone, email, name, cpf }` se fornecidos no carregamento.
- Ao clicar em "Endosso/Sinistro", em vez de mostrar a grade de Ramos (Auto, Fogo...), o Wizard buscará a lista de apólices ativas. O usuário verá os Cards das Apólices. Ao clicar, o wizard inicializa já atrelando o `policy_id` na solicitação (`customFields.policy_selected`).

### 2.4 Inbox e Visualização
- Atualmente `PortalSolicitacoes.tsx` é apenas uma lista.
- Vamos adicionar um `Dialog` ou `Sheet` para mostrar os detalhes do Payload Json que o cliente preencheu (resumo das respostas).

### 2.5 "Hall" de Seleção de Corretora (App WebView)
- Uma rota raiz `/app` para listar as corretoras (caso não saiba para qual slug ir) e um botão de "Entrar no meu Portal". Isso desvia a Landing Page inicial, focando no Segurado.

## 3. Mapas de API
As mudanças demandam forte uso de Context / React Router para navegação com os dados de inicialização e componentização correta em Shadcn UI.
Nenhuma nova tabela será necessária; uso massivo dos endpoints de `policies`, `requests` (inbox), e `clientes`.
