# Design DRE UI Refinement (Spec 020)

## Modificações Visuais

1. **Camada de CSS para a Categoria (Sticky Column)**:
   - Removido opacidades de hover: As células base para linhas brancas serão preenchidas por um `bg-background` (fundo principal do App).
   - Para linhas listradas, a célula sticky levará um `bg-muted` ou `bg-muted/50` sem opacidades malucas ao lado esquerdo.
   - Adicionaremos **`backdrop-blur-md`** só por precaução na primeira célula na cabeça da tabela, de modo que o header congele os números com precisão!

2. **O Quebra-Cabeças do `colSpan={15}` (Agrupadores de Receita e Despesa)**:
   - Os títulos verdes (`(+) RECEITAS`) e vermelhos (`(-) DESPESAS`) esticados (`colSpan={15}`) sofrem muito com o _sticky scrolling_ que prende todo o box.
   - A saída arquitetônica será **fatiar o header de categoria**: A primeira coluna (`colSpan={1}`) recebe o nome "`(+) RECEITAS`" enquanto as outras 14 colunas (`colSpan={14}`) viram um filete horizontal vazio que acompanha a cor do grupo!
   - Esse modelo é à prova de falhas em qualquer browser. O nome da categoria fica cravado no scroll!

3. **Cores e Bounding Boxes menos caóticas**:
   - `bg-emerald-500/15` nas linhas de agrupador e total vai ser refinado para ter cores mais sólidas que suportem letreiro ou que exijam menos transparência.
   - Na linha de subtotais (ex: `= Total Receitas`), onde existem números ao longo de vários meses, garantiremos que eles cruzem por debaixo do `sticky = Total Receitas` sem bater. A célula 0 (`= Total Receitas`) precisa ter o mesmo Background Sólido da Tabela (O que faltava antes).

4. **YTD e Totais**:
   - Adicionaremos um contraste extra de cor para isolar as colunas de "YTD" e "Total" dos meses do ano. Um background suave de `bg-card` contra o `bg-background` ressalta fortemente o quadro anual!

## Arquivos Relevantes:
- `src/components/financeiro/DreTable.tsx`
