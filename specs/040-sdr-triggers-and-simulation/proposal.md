# Master Spec: 040 SDR Triggers & Simulation

## 1. Visão Geral
Este documento foca na evolução da usabilidade, roteamento da inteligência e experiência real de testes do SDR Visual Builder. Identificamos que o usuário precisa de um painel onde a automação não é apenas "desenhada", mas efetivamente *gerenciada* e *testada*, com gatilhos (triggers) bem definidos que dizem ao sistema exatamente "quando" esse fluxo específico assume a conversa de um cliente.

## 2. Lacunas e Incongruências Atuais
1. **Posicionamento de Drag & Drop Incorreto:** Ao soltar um nó no canvas, ele aparece com um "offset" (fora do ponteiro do mouse). Isso ocorre devido a uma mudança de cálculo de coordenadas na v12 do React Flow (`screenToFlowPosition` vs `project`).
2. **Gerenciador de Workflows "Mockado":** Clicar em outro fluxo ou em "Novo Fluxo" na sidebar não faz nada. O usuário não consegue isolar diferentes automações ou ativar/desativar cada uma delas (Status Inativo/Ativo real).
3. **Ausência de Gatilhos (Routing) Inteligentes:** Atualmente, a IA não sabe "quando" iniciar o fluxo. O nó inicial "Início da Conversa" não tem propriedades de configuração. Ele deveria permitir definir regras de entrada, como: "Iniciar quando o lead entrar no Funil X", ou "Quando não tiver nenhum funil", ou "Qualquer mensagem de cliente".
4. **Simulador de Testes Faltante:** O botão "Testar no Simulador" apenas exibe um *toast*. Precisamos de uma janela de chat embutida real para interagir com uma IA (mockada ou conectada ao backend) baseada no fluxo aberto.

## 3. Proposta de Expansão e Correções

### 3.1 Correção do Drag and Drop
Ajustar a matemática de soltura na função `onDrop` do `ReactFlow` para que a posição do nó no canvas coincida exatamente com a ponta do cursor do usuário.

### 3.2 O Gerenciador de Fluxos (State Management)
Implementar um estado global local (`workflows` array) dentro do construtor:
- Cada item da lista de fluxos (na aba "Fluxos" da esquerda) pertencerá a esse array e carregará seu próprio conjunto de `nodes` e `edges`.
- Adicionar um *Toggle Switch* "Ativo/Inativo" no TopBar (Header) que salvará o status daquele fluxo atual.
- Fazer o botão "Novo Fluxo" criar um esqueleto em branco no array e focar nele.

### 3.3 A Configuração do Nó "Trigger" (Início)
O nó de Trigger será clicável. A aba de Propriedades (Direita) mostrará as regras de inicialização daquele fluxo:
- **Público-Alvo:** Todos os Contatos, Somente Clientes, Somente Desconhecidos.
- **Gatilho de Etapa:** Qualquer Etapa, Fora de Funil, Funil Específico (Ex: Auto), Etapa Específica (Ex: Qualificação).
Isso permitirá criar fluxos SDR especialistas (Ex: Um SDR só para resgatar Leads Frios, outro só para dar boas-vindas a novos contatos).

### 3.4 Simulador de Chat (Preview Window)
Ao clicar em "Testar no Simulador", uma gaveta (Drawer) ou Janela Flutuante (Window) se abrirá sobrepondo o lado direito da tela. 
- A janela terá a aparência de um celular (estilo WhatsApp/Webchat).
- O usuário poderá digitar mensagens e ver respostas simuladas (que refletem as decisões tomadas no canvas).

## 4. User Stories
- **US1:** Como Usuário, quero arrastar uma ferramenta "Criar Cliente" e vê-la cair exatamente na ponta do meu mouse.
- **US2:** Como Criador de Fluxos, quero clicar no nó "Início da Conversa" e configurar para que a IA só use este fluxo se o lead estiver na etapa "Qualificação" do funil "Saúde".
- **US3:** Como Testador, quero clicar no botão de Simulador e ver uma janelinha de chat abrir ali mesmo, para mandar um "Oi" e testar as condicionais lógicas que programei no canvas antes de publicar para meus clientes.
- **US4:** Como Gerente, quero criar 3 fluxos diferentes, trocar entre eles clicando na barra esquerda, e desligar (inativar) o "Fluxo 2" enquanto ainda testo o "Fluxo 3".
