# Design Spec: Sincronização Desempenho Global vs Bancário

## Módulos e Arquiteturas Envolvidas
Nesta refatoração da UI, não precisamos encostar o Supabase MCP ou rodar migrações, pois os dados estão corretos a nível estatístico. As queries e procedures do backend (`get_unbanked_transactions`) já existem e funcionam, nós apenas religaremos o Front para utilizá-las adequadamente.

A responsabilidade aqui recai apenas sobre os componentes de interface React do **Antigravity**.  Nenhuma UI massiva é requerida (portanto, não ativaremos o _Stitch MCP_).

## Frontend Components (React Shadcn/UI)

1. **`src/components/financeiro/CaixaTab.tsx`**
   - **O que será alterado:** Restaurar a importação comentada e renderização de `<UnbankedTransactionsAlert />`.
   - Lógica: Se o resultado de `useUnbankedTransactions()` (que criamos/lemos de `useBancos.ts`) retornar tamanho `> 0`, mostrar o Alert no topo abaixo das Header Keys permitindo o quick action do fluxo.

2. **`src/components/financeiro/bancos/UnbankedTransactionsAlert.tsx`**
   - **O que precisa ser verificado/criado:** Esse componente foi marcado como "Removed", então é provável que precisemos verificar a existência de seu arquivo original ou recriá-lo se foi deletado de fato. O design envolverá um card do Shadcn alertando a quantidade e soma monetária das transações que não constam em Banco. 

3. **`src/components/financeiro/bancos/BankDashboardView.tsx`**
   - **O que será alterado:** O sumário global listado na interface de "Todos os Bancos" ignora os repasses de transações órfãs. A alteração vai incluir um pequeno aviso interativo ou aprimorar o Hook `useBankTransactions(bankAccountId)` para quando o ID for "todos" ou "null", ele explicitamente mesclar um "Virtual Bank" com tudo que não foi linkado para bater o saldo certinho.

## Mapa de Dependências
- `useUnbankedTransactions` -> Componente de Alerta.
- `useAssignBankToTransactions` -> O modal de assignação (provável `AssignBankModal` já existente) dependente de ser listado.

## Regras Visuais
O novo componente será sutil (Cor amarela "warning" ou um azul sutil), focando em não "apitar erro" para não assustar o usuário, mas transparecer que ele possui valores a receber/recebidos alocados num "caixa físico virtual".
