

# Plano: Deploy do dispatcher corrigido + migration de limpeza

## Estado atual

O código já está correto no repositório:
- `resolveContext.ts` — busca produtores apenas da brokerage atual, comparação estrita `slice(-11)`
- `processAdminLogic.ts` — instrução WhatsApp via system prompt, não mais injetada no conteúdo do usuário

## O que falta

### 1. Migration de limpeza do histórico contaminado
Criar migration SQL para purgar registros do `admin_chat_history` com o número de teste que vazou entre tenants:
```sql
DELETE FROM admin_chat_history WHERE phone_number LIKE '%956076123%';
```

### 2. Deploy da Edge Function `chatwoot-dispatcher`
Usar a ferramenta de deploy para atualizar a função em produção com o código corrigido.

## Arquivos
- Criar: `supabase/migrations/2026XXXX_clean_admin_history.sql`
- Deploy: `chatwoot-dispatcher`

