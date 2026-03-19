

# Plano: Limpar dados CRM da conta JJ Amorim e alinhar com seed padrão

## Situação atual (contato@jjamorimseguros.com.br)

**Pipelines existentes:**
- "Auto" (default) — 7 etapas (inclui "teste")
- "Consorcio" — 6 etapas

**Deals:** 3 deals no pipeline "Consorcio" (todos em "Perdido" — são testes)

**Produtos:** Apenas "Auto" e "Residencial"

**O que o seed cria para novos usuários:**
- Pipeline "Seguros" (default): Novo Lead → Em Contato → Proposta Enviada → Negociação → Fechado Ganho → Perdido
- Pipeline "Sinistros e Assistência": Abertura → Documentação → Em Análise → Aprovado → Negado → Concluído
- Produtos: Seguro Auto, Seguro Vida, Seguro Residencial, Consórcio, Fiança Locatícia

## Ações (via SQL direto no banco — dados, não schema)

### 1. Deletar deals de teste
Os 3 deals são testes em "Perdido". Deletar para limpar referências.

### 2. Deletar AI settings, stages e pipelines antigos
Remover `crm_ai_settings` → `crm_stages` → `crm_pipelines` do user `65b85549...`

### 3. Deletar produtos antigos
Remover "Auto" e "Residencial"

### 4. Executar seed padrão
Chamar `seed_user_defaults('65b85549-c928-4513-8d56-a3ef41512dc8')` — mas isso também recriaria seguradoras e ramos (que já existem).

**Alternativa melhor:** inserir manualmente apenas os pipelines, stages e produtos padrão para evitar duplicar seguradoras/ramos.

### 5. Atualizar DEFAULT_STAGES no frontend
O array `DEFAULT_STAGES` em `useCRMPipelines.ts` (linha 24-30) ainda usa as etapas genéricas. Atualizar para refletir as etapas do pipeline "Seguros" (que são as mesmas, então na verdade já está correto).

## Resumo de operações

| Operação | Tipo |
|---|---|
| DELETE deals de teste | Dados (SQL insert tool) |
| DELETE ai_settings do user | Dados |
| DELETE stages do user | Dados |
| DELETE pipelines do user | Dados |
| DELETE produtos do user | Dados |
| INSERT 2 pipelines + 12 stages + 5 produtos | Dados |

Nenhuma alteração de schema. Nenhuma alteração de código (o seed já está correto).

