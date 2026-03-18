# Proposal: Modularização Nativa do JJ Seguros e Reorganização de Menus (Spec 006)

## 1. Contexto e Problema
A tentativa anterior de criar uma landing page genérica falhou, pois divergiu do objetivo real. O objetivo real não é recriar uma tela, mas sim **embutir 100% do projeto atual `jjseguros` como um módulo nativo dentro do Tork CRM**. Além disso, há menus de configurações que precisam ser limpos e realocados para lugares mais eficientes na usabilidade.

## 2. Nova Arquitetura de Módulo (O "100% Modular")
O projeto `jjseguros` possui sua própria Landing Page perfeita e seu próprio Painel Admin perfeito.
- Eles deixarão de ser um repositório isolado.
- Tudo que está na pasta `src` do `jjseguros` será migrado ordenadamente para dentro da pasta `src/modules/jjseguros` (ou equivalente) no repositório do Tork CRM.
- A Landing Page do JJ Seguros se tornará a rota oficial pública do CRM: `/quote/:slug` ou análoga. 

## 3. Reorganização do Portal Inbox (Painel do Corretor)
Em `/dashboard/solicitacoes-portal`, a interface do Corretor terá 3 abas precisas:
1. **Solicitações**: A lista atual de pedidos que vêm do Portal do Cliente.
2. **Admin (Cotações)**: Receberá **exatamente** a tela de Admin que existe no repositório do JJ Seguros, atuando como o gerenciador das cotações que os leads enviam.
3. **Portal**: Conterá o `PortalSettings` nativo (onde ele configura se mostra apólices, etc) e as configurações de theaming (slug, branding) e links públicos.

## 4. Reorganização Global de Settings
A tela de `/dashboard/settings` atualmente está poluída.
- Ficarão apenas: **Perfil, Corretoras, Produtores, Seguradoras e Ramos**.
- A aba **Chat Tork** será sumida daqui (pois as configs de IA e chat já estão lá em Automações).
- A tela recém-criada de **Produtos** vai sair daqui e ir pro menu lateral principal do CRM (Operacional), já que Produtos são coisas do dia a dia da corretagem e não configurações frias de sistema.
