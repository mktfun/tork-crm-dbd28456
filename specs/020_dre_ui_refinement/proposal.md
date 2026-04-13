# Proposta DRE UI Refinement (Spec 020)

## Problema
O componente atual do DRE (`DreTable.tsx`) é vital para a operação financeira, mas está apresentando dois problemas importantes observados pelo usuário em produção:
1. **Quebra Visual de Scroll (Sticky Col Bug):** Quando o usuário realiza rolagem horizontal na tabela do DRE, os títulos da primeira coluna (Categoria / Mês) que estão fixados (`sticky left-0`) possuem transparências ou `colSpan` incorretos. Isso faz com que os valores das outras células "vazem" por trás dos textos fixos, embaralhando números e letras ("fica tudo quebrado").
2. **Design Ruidoso e não Profissional:** O visual base atual tem alto uso de opacidades (`bg-emerald-500/15`, etc) e backgrounds alternados que não combinam tão bem com o padrão limpo contábil de linhas horizontais diretas, que o usuário espera. 

## Solução (O Que Será Feito)
- **Correção da Transparência no Scroll:** A primeira coluna do DRE terá um background *sólido* e opaco (`bg-card` ou `bg-muted` firme). Assim, à medida que os meses deslizam por debaixo dela, nada irá "vazar" visualmente.
- **Isolamento do `colSpan`:** Removeremos o `sticky` das linhas de agrupamento total (`(+) RECEITAS`) que ocupam as 15 colunas, ou as dividiremos artificialmente, para que o navegador lide perfeitamente com a âncora lateral sem estourar o limite da página.
- **Redesign Estilo Financial Statement:** Melhorar a espessura das bordas do DRE (estilo spreadsheet moderna, minimalista), destacando a coluna de YTD e os totais das categorias com uma tipografia mais limpa, trazendo maior facilidade de leitura para os olhos.

## Reutilizados (Nível de Código)
- O hook `useDreData` no backend não sofrerá modificações (já corrigido na Fase 3).
- O estado de `compactMode` (visão expandida/compacta) e de `selectedYear` não muda.
- Toda a lógica do `auditTarget` (que abre a gaveta de detalhamentos a receber) continua preservada.

## Critérios de Aceite
1. O usuário pode deslizar o DRE 100% para a direita (até chegar no `Total`); as fatias numéricas desaparecem fluidamente debaixo dos títulos das categorias da esquerda.
2. Nenhuma letra pode ficar "sopreponto" os números de receita/despesa durante o scroll.
3. O componente do DRE precisa demonstrar a estrutura de cores melhor resolvida (menos neon na parte das linhas, e maior profissionalidade para faturamento elevado).
