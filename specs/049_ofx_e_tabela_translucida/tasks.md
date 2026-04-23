# Checklist: Master Spec 049

## Fase 1: Correção do OFX (Date Shift)
- [ ] Em `StatementImporter.tsx`, reescrever o bloco onde a data lida do OFX (`DTPOSTED`) é atribuída. Substituir a criação de novo `Date` via parse numérico por atribuição direta do ano, mês e dia como string interpolada `YYYY-MM-DD`.

## Fase 2: Tabela Translúcida de Bancos
- [ ] Em `BankTransactionsTable.tsx`, alterar o background das linhas para usar a identidade moderna do resto do painel (ex: `hover:bg-white/[0.02]` ou `.03`), e tirar bordas grossas, garantindo fluidez total na visão "extrato bancário".
- [ ] Remover classes estritas de background dos badges se elas estiverem bloqueando o contorno.

## Fase 3: Hierarquia DRE na Categorização de Transações
- [ ] Listar instâncias de categoria (esporadicamente `TransactionDetailsSheet.tsx` ou afins) e usar o método `flattenedExpenseAccounts` (ou `flattenedRevenueAccounts`) que injeta a variável `account.level` e adiciona `↳` antes de subcategorias.
- [ ] Garantir que na UI o nível seja visualizado através de `padding-left` ou símbolo visual no select de categorias.

## Fase 4: Build e Bateria Final
- [ ] Rodar LINT para os arquivos editados e o processo Vite.
