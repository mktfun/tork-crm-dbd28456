# Checklist DRE UI Refinement (Spec 020)

## Passos da Interface (Frontend)
- [x] Ler o arquivo `src/components/financeiro/DreTable.tsx`.
- [x] Ajustar a const `stickyColClass` para depender de modo seguro do seu parent container. (Puxar cores opacas).
- [x] Consertar a trinca de estilos: substituir as opacidades flácidas por cores sólidas no lado esquerdo (`bg-background` e `bg-card` ou cores do Tema para manter listras).
- [x] Extrair o `colSpan={15}` do título unificado `(+) RECEITAS` e separá-los para um esquema `colSpan={1}` fixado (para ficar a frase) e o restante do array invisível/border. (A mesma coisa para o vermelho `(-) DESPESAS`).
- [x] Validar compilação do DRE via VITE.
- [x] Subir para o servidor (Git commit).
