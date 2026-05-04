# Proposal 055: Correção do Delay de Data na Importação OFX (Extrato)

## 1. Problema Identificado
O usuário e os testers relataram que as transações importadas via arquivo OFX aparecem com a data correta no momento da pré-visualização da importação, mas ao "caírem no sistema" (na tabela do Extrato e no Dashboard de Conciliação), as datas aparecem com 1 dia de atraso. 

**Causa Raiz:** O problema é gerado pelo fuso horário (Timezone Shift).
O parser do arquivo OFX (no `StatementImporter.tsx`) salva a data corretamente no formato estrito ISO `YYYY-MM-DD` (ex: `2026-05-01`). 
No entanto, os componentes visuais de extrato (`ReconciliationWorkbench.tsx`, `ReconciliationPage.tsx` e `StatementTable.tsx`) estão renderizando essa data usando `new Date(item.transaction_date)`. 
No JavaScript, quando passamos uma string `YYYY-MM-DD` para o construtor `new Date()`, ele assume que a data está em UTC (GMT+0). Ao exibir a data no navegador do usuário (que no Brasil geralmente é GMT-3), a data é convertida subtraindo 3 horas. Ou seja, `2026-05-01T00:00:00Z` vira `2026-04-30 21:00:00`, exibindo o dia anterior.

## 2. Requisitos e User Stories
* **Como** usuário financeiro, **eu quero** que as transações do meu extrato importado exibam a data EXATAMENTE como constam no arquivo OFX do meu banco.
* **Como** usuário financeiro, **eu não quero** ver minhas transações do dia 10 aparecendo como se fossem do dia 09.

## 3. O que já existe e será reutilizado
* Já existe um utilitário específico para contornar essa falha do Javascript no repositório: `parseLocalDate` e `formatDate` localizados em `src/utils/dateUtils.ts`.
* Essas funções garantem que a string `YYYY-MM-DD` seja "desmembrada" (`year, month, day`) e processada de acordo com o timezone local, impedindo o shift de dia.

## 4. O que precisa ser modificado
Apenas componentes de visualização da conciliação bancária:
* `src/features/finance/components/reconciliation/ReconciliationWorkbench.tsx`
* `src/features/finance/components/reconciliation/ReconciliationPage.tsx`
* `src/features/finance/components/reconciliation/StatementTable.tsx` (se aplicável)
* Qualquer outro componente dentro da pasta `reconciliation` que utilize `format(new Date(item.transaction_date), ...)`

**NÃO será necessário:** 
* Criar colunas ou tabelas no banco de dados.
* Modificar a lógica do Parser OFX (ele já salva como String sem timezone, o que é ideal).

## 5. Critérios de Aceite
1. O usuário sobe um arquivo OFX.
2. Na tela de conciliação / workbench, uma transação datada no OFX como 05/05/2026 deve aparecer estritamente como 05/05/2026 na interface, independentemente do fuso horário da máquina do cliente.
