# Proposal: Gerenciamento de Produtos (Ramos)

## 1. Contexto e Problema
Atualmente, o CRM trata negócios (Deals) de forma genérica ou associados indiretamente ao título do Deal. Para que corretoras possam escalar e padronizar o funil universal (Seguros e Sinistros), é essencial que haja uma entidade `Produtos` (Ramos, ex: Auto, Vida, Fiança, Residencial). Isso permite que o N8N e a inteligência artificial criem Deals precisos e atrelem os produtos certos à negociação desde o primeiro contato.

## 2. Objetivos
- Criar a entidade de Banco de Dados `crm_products` para armazenar os produtos configuráveis pela corretora.
- Popular novos cadastros (onboarding) com produtos básicos já criados por padrão.
- Desenvolver interface administrativa (UI) não-destrutiva para o corretor Cadastrar, Editar e Desativar produtos.
- Integrar a listagem de produtos com a tela de Deals (ao criar/editar um Deal, poder selecionar o Produto alvo).

## 3. Escopo Técnico
- **Supabase / DB**: Migração para a nova tabela `crm_products` com RLS (Row Level Security) atrelando ao `company_id`.
- **Backend (Edge Function)**: Atualizar (se aplicável futuramente) a emissão de payloads ou inserção padrão em um gatilho de *novo tenant*.
- **Frontend**: 
  - Nova tela de configurações `/settings/products` ou nova Tab dentro de "Configurações Globais".
  - Componente de DataTable ou GridCards para listagem rápida.
  - Dialog (Modal) para Criar/Editar.
  - O design deve manter o layout padrão premium do Tork CRM (Shadcn UI).

## 4. Fora de Escopo
- Automações diretas de cotação de produto (apenas gerenciaremos os cadastros estruturais nesta fase).
- Controle de estoque (inaplicável para corretoras de seguro).

## 5. Próximos Passos
- Aprovação desta Proposal.
- Geração da Migração no Supabase.
- Construção visual do CRUD pelo Antigravity / Stitch MCP.
