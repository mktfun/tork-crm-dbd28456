# UX/UI Design: Gerenciamento de Produtos (Ramos)

## 1. Visão Geral da Interface
A interface de Gerenciamento de Produtos deve residir dentro das configurações administrativas do CRM (ex: `/dashboard/settings/products` ou como uma aba adicional nas configurações do sistema). O objetivo é ser rápido, não-destrutivo e muito fácil para o gestor da corretora visualizar o portfólio de produtos que a inteligência artificial tem permissão para oferecer e atrelar aos Deals.

## 2. Padrões Visuais (Shadcn UI)
Toda a interface deve utilizar os primitivos existentes da `shadcn/ui` já instalados no Tork CRM:
- **Button**: Ações primárias e secundárias.
- **Table / DataTable**: Listagem de produtos.
- **Badge**: Indicativo visual de status (`Ativo`, `Inativo`).
- **Dialog / Sheet**: Modais para Criação e Edição de produtos, mantendo o usuário na mesma tela sem refrescar a página.
- **Lucide Icons**: Uso extenso de ícones para representar ações (Pencil, Trash2, Plus, Package).

## 3. Estrutura da Tela Principal (`ProductsSettings.tsx`)
1. **Header**: 
   - Título: "Produtos e Ramos"
   - Descrição: "Gerencie as categorias de seguros e serviços que sua corretora oferece."
   - Botão + (Primary): "Novo Produto" na extrema direita.
2. **Body (DataTable)**:
   - **Nome do Produto**: Ex: Seguro Auto, Consórcio Imobiliário.
   - **Descrição**: Breve texto para a IA entender do que se trata (opcional).
   - **Status**: Badge Verde ("Ativo") ou Cinza ("Inativo").
   - **Ações**: Dropdown Menu (`...`) no canto direito da respectiva linha contendo as opções **Editar** e **Desativar**.

## 4. Formulário de Criação/Edição (`ProductDialog.tsx`)
Abertura em Dialog centralizado. Campos obrigatórios:
- **Nome do Produto** (Input text): Como o cliente e a equipe enxergam.
- **Descrição Interna** (Textarea): Instruções rápidas para a triagem da IA (ex: "Oferecer apenas para grandes corporações").
- **Status (Switch/Toggle)**: Ativo por padrão. Define se está visível para criação de novos Deals.

## 5. Integração com a Tela de Deals (Opcional Futuro/Fase 2)
Na hora de criar um "Novo Deal" manual ou ao visualizar as propriedades do Deal no funil, haverá um novo `<Select>` alimentado pela lista cadastrada de Produtos ativos, puxando a relação `deal.product_id`.
