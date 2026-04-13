# Finance Module Redesign UI/UX Specs

## 1. Visão Geral
Este documento define as especificações visuais do Redesign do módulo financeiro. Nenhum código será escrito na fase de execução sem que os componentes visuais e layouts sejam mapeados aqui.

## 2. Padrões de Componentes `shadcn/ui`
- **Tabelas**: Uso obrigatório do `<Table>` e `<ScrollArea>` limpos, sem backgrounds hardcodados em "preto" para preservar suporte a Light Theme.
- **Botões**: Uso consistente de variáveis padronizadas de `variant` (`default`, `outline`, `ghost`, `destructive`). Nada de cores hexadecimais *hardcoded*.
- **Estrutura de Página**: Isolamento da Feature (Dashboard > Extratos > Contas). Cada subrotina deve seguir um esqueleto mestre usando componentes base `AppCard`.

## 3. Soluções Visuais Mapeadas para Refatoração
**A) Tela de Conciliação (A Grande Prioridade)**
- O split-view (visão dividida) entre Extrato e Sistema precisa ser refeito. Deve ser usado um layout em duas colunas fixas e scrolláveis (lado a lado real, com fácil comparação `1:1` e `N:1`).
- Os botões de dar baixa vs conciliar serão totalmente separados visualmente por cores semânticas (`success` para bater, `secondary` para arquivar).

**B) Ações em Lote (Bulk Actions)**
- Ao dar check em várias linhas não-comissão do extrato que não tem pareamento automático, abriremos uma "Modal/Sheet" bulk.
- Ao invés de perguntar o Plano de Contas dezenas de vezes, perguntaremos apenas **1 vez**. O hook React Query se encarregará de fazer o *loop map* e despachar a mutation com esse plano de contas global para todas as selecionadas.
