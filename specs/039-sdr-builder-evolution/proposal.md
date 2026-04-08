# Master Spec: 039 SDR Builder Evolution & Workflow Lifecycle

## 1. Visão Geral
Este documento estabelece a fundação arquitetural para transformar o atual "SDR Visual Builder" de um protótipo estático para uma verdadeira Engine de Workflows de IA (semelhante ao n8n ou Typebot). O foco é corrigir incongruências lógicas (nós com apenas uma saída), permitir a edição profunda das propriedades de cada ferramenta, possibilitar a exclusão de elementos, e adicionar a capacidade de criar, testar e publicar múltiplos fluxos de automação independentes.

## 2. Problemas e Incongruências Identificadas
1. **Limitação de Fluxo Linear (Uma Saída):** Atualmente, todos os nós usam o padrão `default` do React Flow (apenas uma bolinha de saída). Ferramentas de Decisão (Se... Então) precisam obrigatoriamente de duas saídas (Verdadeiro / Falso). Ferramentas de Ação (ex: Criar Cliente) precisam de saídas de Sucesso ou Falha para tratamento de erro da IA.
2. **Edição Estática e Imutável:** O painel de Propriedades apenas mostra inputs visuais, mas eles não estão salvando os dados de volta no estado do Nó. Além disso, não há uma descrição clara do que o Nó faz na sidebar.
3. **Ausência de Deleção:** Não há como o usuário remover um bloco arrastado por engano ou excluir uma linha (Edge) de conexão.
4. **Fluxo Único Global:** Não há conceito de "Salvar este Fluxo", "Criar Novo", "Testar" ou "Ativar/Desativar em Produção". Tudo funciona como um único rascunho infinito.

## 3. Proposta de Solução (Arquitetura)
### 3.1 Custom Nodes (React Flow)
A arquitetura precisará abandonar os nós `default` e introduzir Componentes Customizados (`CustomNode`):
- **DecisionNode:** Terá duas saídas (`source-true` em verde, `source-false` em vermelho).
- **ActionNode / ToolNode:** Terá saídas de Continuação (`success`) e Tratamento de Erro (`fallback/error`).
- **MessageNode:** Terá apenas uma saída para continuar o fluxo.
Isso permitirá criar árvores de decisão ricas e complexas.

### 3.2 Interatividade Avançada (Canvas)
- Habilitar exclusão de Nós e Arestas via teclado (teclas `Backspace/Delete`).
- Adicionar um botão de `Excluir Ferramenta` na cor vermelha (Destructive) no final da Sidebar Direita.
- Conectar os formulários da Sidebar ao estado da árvore. Ao alterar um `<input>`, a função `setNodes` será disparada atualizando a propriedade `data.config` daquele Nó específico.

### 3.3 Lifecycle e Múltiplos Workflows
Em vez de um único fluxo, a tela precisa gerenciar uma lista de **Automações SDR**:
- **Lista de Fluxos:** Uma barra lateral esquerda (ou menu superior) onde o usuário pode clicar em "Nova Automação" (ex: "Qualificação Automóvel", "Renovação de Vida").
- **Status (Rascunho vs Produção):** Um Toggle na barra superior (`Header` do Canvas) permitindo que o administrador marque o fluxo como "Ativo" ou "Inativo".
- **Botão de Testar (Simulador):** Um modo especial onde um modal de Chat se abre para o usuário conversar com a IA rodando especificamente aquele fluxo de teste, iluminando os nós conforme eles são executados.

## 4. User Stories
- **US1:** Como Administrador, ao arrastar uma ferramenta de Decisão, quero puxar uma linha a partir da bolinha verde ("Sim") para mandar a IA emitir uma mensagem, e uma linha da vermelha ("Não") para encerrar o atendimento.
- **US2:** Como Administrador, quero poder clicar em uma ferramenta inserida por engano e apertar "Deletar" na sidebar ou no teclado para limpá-la do meu painel.
- **US3:** Como Administrador, quero editar o campo de texto da ferramenta "Enviar Texto Padrão" na sidebar, clicar fora, e ter certeza de que esse texto foi salvo dentro daquele bloco para quando a IA for usá-lo.
- **US4:** Como Administrador, quero poder criar um fluxo chamado "Atendimento Noturno", testá-lo em um simulador integrado, e só depois clicar em "Publicar em Produção".
