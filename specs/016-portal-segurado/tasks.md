# Tasks: Portal do Segurado v2

Este é o documento de referência para o Workflow `/vibe-apply`.

## FASE 1: Correção de Bugs Críticos (UX & Login)
- [x] Mover o subcomponente `ProfileRow` para FORA do `PortalProfile` para evitar perda de foco e o teclado fechando.
- [x] Refatorar a query de busca em `PortalLogin.tsx` (`fetchBrokerage` e `goToPasswordStage`). 
  - Limpar qualquer formatação do CPF do usuário (apenas dígitos).
  - Usar query Supabase insensitive ou extrair a busca para lidar melhor com falhas (ex: verificar CPF limpo vs formatado).
- [x] Mudar o payload do `handleSubmit` em `PortalOnboarding.tsx` para passar dados higienizados para a RPC `update_portal_profile` e garantir que `sessionStorage` seja preenchido com todos os campos atuais.

## FASE 2: Auto-fill em Cotações
- [ ] Obter o cliente logado na raiz do `PortalWizard.tsx`.
- [ ] Modificar todos os formulários da pasta `src/components/portal/wizards/` (Auto, Res, Vida, Empresa, Saúde, etc.) para aceitarem uma prop opcional `initialData`.
- [ ] Ao montar o form do Wizard, injetar nome, cpf, email e telefone direto nos `defaultValues` do `react-hook-form`.

## FASE 3: Endosso e Sinistro com Seleção de Apólice
- [x] Criar no `PortalWizard.tsx` uma condição específica quando `type === 'sinistro' || type === 'endosso'`.
- [x] Buscar (via supabase) a tabela `policies` onde `client_id` for igual ao logado e listar cards para o Segurado escolher.
- [x] Injetar o `policyNumber` e os dados dessa apólice na tela de Endosso/Sinistro enviada para o Brokerage.

## FASE 4: Experiência Geral e Hub de App
- [x] Adicionar botão "Pedir Ajuda no Whatsapp" na `PortalHome.tsx` aproveitando as `brokerageSettings` carregadas via Custom Hook. O link deve ser de tipo Whatsapp (`wa.me`) usando o telefone da corretora.
- [x] Adicionar Modals de `View Details` em `PortalSolicitacoes.tsx` que parseia o campo JSON de `custom_fields` da tabela `requests` e exibe amigavelmente as informações para o segurado.
- [x] Criar a view /app em `/src/pages/MobileAppStartup.tsx` ou análogo que roteia ou para a Landing Page (institucional) se desktop, ou se for mobile (APK) e não houver slug, mostra uma listinha / barra de busca simples da corretora.
