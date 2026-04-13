# Master Spec: 037 Automation UI Revamp & SDR Visual Builder

## 1. Visão Geral
Este documento detalha o planejamento para a reformulação completa da tela de Automação de IA (AI Automation) do Tork CRM. O objetivo é transformar uma interface atualmente complexa e disfuncional em uma experiência "Liquid Glass" premium, dividida em dois níveis de complexidade: uma visão limpa e simplificada para o "usuário normal" (corretor) configurar sua IA, e um novo "SDR Visual Builder" (estilo n8n simplificado) para usuários avançados visualizarem e editarem o fluxo de inteligência da IA.

## 2. Requisitos e Lacunas Atuais
- **R1:** O layout atual em `AIAutomationDashboard.tsx` mistura gerenciamento de etapas do funil, configurações globais da IA e um Sandbox de teste em uma única tela confusa. 
- **R2:** O usuário normal precisa de uma tela de configuração simples, visual (toggles grandes, seleções claras de "Tom de Voz", "Modo de Operação", sem lidar com JSONs ou prompts longos de forma exposta).
- **R3:** Usuários avançados e administradores precisam visualizar e editar o comportamento do SDR (Sales Development Representative) da IA em um formato de fluxo/nós (node-based), permitindo habilitar/desabilitar "Tools" (ex: Busca de Cotação, Busca de Sinistro) de forma visual.
- **R4:** A estética deve seguir o padrão Maximalista/Liquid Glass de 2026, abandonando cards secos e utilizando efeitos de vidro fosco, blur, grids sutis e animações fluidas.

## 3. User Stories
- **US1:** Como Corretor (usuário normal), quero uma tela de Automação onde eu possa apenas ligar/desligar a IA por funil e escolher sua personalidade, sem ver código ou configurações avançadas, para que eu não quebre o sistema.
- **US2:** Como Administrador, quero acessar o "SDR Flow Builder", uma tela visual estilo diagrama (n8n), onde eu possa ver as "Tools" disponíveis para a IA e conectá-las às etapas do funil, compreendendo exatamente o que a IA pode ou não fazer em cada fase.
- **US3:** Como Usuário, quero que a interface responda de forma fluida (Premium) a cada toggle que eu ativar, mostrando animações que me deem a sensação de um sistema tecnológico de alto padrão.

## 4. BDD Scenarios

### Cenário: Configuração Simplificada (Usuário Normal)
- **Given (Dado):** que um corretor acessa a aba de Automação
- **When (Quando):** ele visualiza as configurações
- **Then (Então):** o sistema exibe apenas controles amigáveis (ex: "Ativar IA no Funil Auto", "Personalidade: Consultor Sênior") e oculta o sandbox de testes técnicos

### Cenário: Visualização do SDR Flow (Usuário Avançado)
- **Given (Dado):** que um admin acessa o "SDR Visual Builder"
- **When (Quando):** ele clica no nó "Ferramenta de Cotação"
- **Then (Então):** o painel lateral abre mostrando configurações limitadas e seguras daquela tool (ex: "Habilitar para Seguradoras X e Y"), sem permitir que ele quebre o código subjacente da Edge Function

### Cenário: Estética Premium e Feedback Visual
- **Given (Dado):** que um usuário salva uma configuração da IA
- **When (Quando):** ele clica no botão "Atualizar Cérebro"
- **Then (Então):** o sistema exibe uma animação "Liquid Glass" suave (ex: brilho no botão, partículas sutis) indicando o salvamento bem-sucedido sem recarregar a página
