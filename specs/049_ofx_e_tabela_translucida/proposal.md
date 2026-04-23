# Spec 049 — Nova Melhoria de Tabelas e Ajustes Críticos (PDF x OFX)

## Visão Geral

Foi identificado que apesar das melhorias da Spec 048, a tabela de transações do banco (`BankTransactionsTable`) ainda tem uma aparência pesada ("feia") com fundos preenchidos, contrastando com o estilo translúcido limpo desejado (provavelmente inspirado nas tabelas premium / conciliação).
Além disso, há um bug crítico de fuso horário no parser de arquivos OFX, onde transações registradas no final/início do dia estão "escorregando" para o dia anterior ao exportar para o banco de dados.
Por fim, nos selects de categoria (DRE), os sub-grupos não estão perfeitamente legíveis da forma desejada na hora de adicionar/editar movimentações bancárias.

---

## User Stories

- **US1:** Como usuário, quero que a `BankTransactionsTable` seja totalmente translúcida (sem fundos pesados por linha), igual às outras tabelas premium do sistema (ex: Conciliação).
- **US2:** Como usuário, ao subir um arquivo OFX, quero que a data do sistema bata exatamente com a data do extrato em PDF (sem cair no dia anterior devido a conversão UTC/Timezone).
- **US3:** Como usuário, ao selecionar uma categoria para uma transação, quero ver claramente a estrutura de árvore (sub-grupos da DRE), com indentação reforçada.

---

## O que JÁ EXISTE e será REUTILIZADO

| Item | Localização | Ação |
|------|-------------|------|
| `BankTransactionsTable` | `src/components/financeiro/bancos/BankTransactionsTable.tsx` | Ajustar completamente o CSS para o design "translúcido" moderno e remover linhas de grid/background. |
| `StatementImporter` | `src/features/finance/components/reconciliation/StatementImporter.tsx` | Refatorar a captura da `date` do DTPOSTED no OFX para salvar como YYYY-MM-DD explícito e driblar erro de UTC. |
| `TransactionDetailsSheet` (e afins) | Vários arquivos usando Categories | Certificar que os dropdowns de categoria usam a tipagem hierárquica `flattenedExpenseAccounts` com a seta `↳` caso ainda não esteja. |

## Plano de Execução Breve

1. Refatoração Visual (Translúcido):
   - Eliminar `bg-muted/50` das tables.
   - Usar `border-b border-white/5` (ou similar) pra linhas finas translúcidas.
2. Arrumar OFX (Bug de Fuso):
   - `date.toISOString().split('T')[0]` gera bug em horários GMT. Substituir no OFX por split literal na string `DTPOSTED`.
3. Arrumar Select DRE:
   - Identificar ponto central de combobox/select de categorias de transações (Provavelmente `TransactionDetailsSheet` e modais) e injetar formatação de hierarquia.

## Critérios de Aceite

- [ ] Tabela de Bancos não mais parece "dura" ou com fundo chato.
- [ ] Importação de OFX com data de meia-noite do dia X não desce para X-1.
- [ ] Grupos da DRE indentados durante a adição de transação.
