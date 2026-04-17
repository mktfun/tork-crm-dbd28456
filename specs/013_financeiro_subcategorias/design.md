# Requisitos Visuais: Subcategorias & Extrato

## Mudanças de UI

### 1. View de "Categorias" (Plano de Contas)
- A lista de categorias deve representar a hierarquia (níveis).
- **Categorias Pai**: Expandidas/Contraídas com um Chevron.
- **Subcategorias**: Com margem à esquerda (`ml-4` ou `ml-6`) e ícone indicador de ramificação para facilitar a leitura.
- Coleta/Tagging: Deve manter os badges atuais ("Despesa", "Receita", "Sistema" etc).

### 2. Modais de Transação (Select de Categorias)
- Onde usamos o componente de seleção de categoria (provavelmente um ShadcN UI `<Select>` ou `<Combobox>`), precisamos agrupar as opciones.
- Se o campo aceita busca (Combobox), a busca deve retornar `Categoria Pai > Subcategoria` no texto, para facilitar encontrar o item.

### 3. Modal de Criar/Editar Categoria
- Inserir um dropdown "Pertence à categoria:" (Select) para o usuário designar a nova categoria como filha. Se estiver vazio é "Categoria Principal".
