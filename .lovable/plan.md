
# Diagnóstico Detalhado: Banco de Contas - Saldo e Clique

## Problema 1: O clique nos cards NÃO abre histórico

### Causa Raiz

Existem **duas telas de bancos** no projeto, e o usuário está acessando a **errada**:

| Tela | Rota | Componente | Tem onClick/Histórico? |
|------|------|-----------|----------------------|
| `CaixaTab` | `/dashboard/financeiro` > aba "Caixa" | `CaixaTab.tsx` | **NAO** - nunca passa `onClick` ao `BankAccountCard` |
| `Bancos` | `/dashboard/bancos` | `Bancos.tsx` | **SIM** - tem `onClick={handleOpenHistory}` e `BankHistorySheet` |

**Prova**: Em `CaixaTab.tsx` (linhas 102-120), o `BankAccountCard` recebe apenas `onEdit` e `onDelete`, mas **nunca recebe `onClick`**. Portanto, clicar no card não faz nada.

Em contraste, `Bancos.tsx` (linha 186) passa `onClick={handleOpenHistory}` corretamente.

### Solucao

Adicionar a funcionalidade de histórico ao `CaixaTab.tsx`:
- Importar `BankHistorySheet`
- Criar state `selectedBank` e handler `handleOpenHistory`
- Passar `onClick` ao `BankAccountCard`

---

## Problema 2: Saldo mostra R$ 0,00

### Causa Raiz

Em `CaixaTab.tsx` (linhas 104-117), os dados do Supabase (`useBancos.BankAccount`) são **re-mapeados** para um objeto literal com campos diferentes:

```typescript
// CaixaTab cria um NOVO objeto incompatível:
account={{
  balance: account.currentBalance,  // campo "balance" nao existe no tipo BankAccount do hook
  label: 'Conta Corrente',          // campo "label" nao existe no tipo BankAccount do hook
  // ... falta currentBalance, createdAt, updatedAt
}}
```

Enquanto `BankAccountCard.tsx` (linha 110) exibe `account.currentBalance` - que é `undefined` nesse objeto remapeado, resultando em `R$ 0,00`.

**Prova (erros de build)**:
- `CaixaTab.tsx(108,19): Type '"digital"' is not assignable to type 'BankAccountType'` - mapeia para tipo inexistente
- `BankAccountsSection.tsx(46,15): Type is missing properties: currentBalance, createdAt, updatedAt` - dados mock incompatíveis

### Solucao

Parar de remapear os dados. Passar a conta diretamente sem transformacao, já que `BankAccountCard` espera o tipo `BankAccount` do hook `useBancos`.

---

## Problema 3: `BankAccountsSection.tsx` usa mocks antigos

### Causa Raiz

`BankAccountsSection.tsx` importa de `financeiroMocks.ts` (tipo com `balance` e `label`), mas `BankAccountCard` espera o tipo de `useBancos.ts` (com `currentBalance`, `createdAt`, `updatedAt`). Os tipos sao incompatíveis.

**Prova (erro de build)**:
```
BankAccountsSection.tsx(46,15): error TS2739: Type 'financeiroMocks.BankAccount' 
is missing: currentBalance, createdAt, updatedAt
```

### Solucao

Migrar `BankAccountsSection` para usar dados reais do Supabase via `useBankAccounts()` (igual ao `Bancos.tsx`), ou remover se nao for mais utilizado.

---

## Problema 4: Erro de build no Edge Function

### Causa Raiz

O resolver de tipos do Deno nao encontra `npm:openai@^4.52.5` porque nao há `deno.json` com mapeamento de imports na pasta de functions.

### Solucao

Nao é necessário fix aqui - este erro vem de uma tipagem interna do `@supabase/functions-js` e nao afeta o runtime. Mas se necessário, criar um `import_map.json` ou `deno.json` com o mapeamento.

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|----------|
| `src/components/financeiro/CaixaTab.tsx` | Remover remapeamento de dados, passar account diretamente, adicionar onClick + BankHistorySheet |
| `src/components/financeiro/BankAccountsSection.tsx` | Migrar de mocks para `useBankAccounts()` ou remover |

---

## Detalhes Tecnicos da Implementacao

### CaixaTab.tsx - Antes vs Depois

**Antes** (quebrado):
```typescript
<BankAccountCard
  account={{
    id: account.id,
    bankName: account.bankName,
    accountType: mapAccountType(account.accountType), // retorna "digital" que nao existe
    balance: account.currentBalance, // campo errado
    label: '...', // campo inexistente no tipo
    // falta currentBalance, createdAt, updatedAt
  }}
  onEdit={() => handleEditBank(account)}
  onDelete={() => handleDeleteBank(account)}
  // SEM onClick!
/>
```

**Depois** (correto):
```typescript
<BankAccountCard
  account={account}  // passa direto, sem remapear
  onClick={handleOpenHistory}  // abre sheet de historico
  onEdit={() => handleEditBank(account)}
  onDelete={() => handleDeleteBank(account)}
/>
```

### BankAccountsSection.tsx

Substituir `useState(mockBankAccounts)` por `useBankAccounts()` do hook real, eliminando a dependencia de mocks incompatíveis.

---

## Resultado Esperado

1. Saldo correto exibido em cada card (vem de `currentBalance` via `get_bank_balance` RPC)
2. Click no card abre `BankHistorySheet` com transacoes paginadas
3. Zero erros de build por incompatibilidade de tipos
