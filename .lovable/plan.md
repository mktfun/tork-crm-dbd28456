
# Plano: Finalização da Migração para Gemini Vision v7.0

## Status Atual

A arquitetura de extração de apólices já foi migrada com sucesso para o modelo **Gemini Vision v7.0**:

- Edge Function `analyze-policy` está operando com Gemini 2.0 Flash
- Frontend em `ImportPoliciesModal.tsx` já consome JSON estruturado diretamente
- Banco de dados está limpo (nenhum registro corrompido encontrado)
- O parser local `universalPolicyParser.ts` está marcado como `@deprecated`

## Ações Restantes

### 1. Limpeza de Código Legado

**Arquivo:** `src/utils/universalPolicyParser.ts` (937 linhas)

Este arquivo é agora dívida técnica pura. Está marcado como deprecated desde a v5.7 e não é mais importado pelo fluxo principal.

**Ação:** Remover completamente ou mover para um diretório `/deprecated` para referência histórica.

### 2. Limpeza de Dados Residuais (Prevenção)

**SQL de Limpeza Preventiva:**
```sql
DELETE FROM clientes 
WHERE name ILIKE 'Ra %' 
   OR name ILIKE '%man ual%' 
   OR name ILIKE '%bella barda%';

DELETE FROM apolices 
WHERE insured_asset ILIKE '%man ual%' 
   OR policy_number ILIKE '%man ual%';
```

**Status:** Consulta executada, **0 registros afetados** (banco já limpo).

### 3. Remoção de Edge Functions Redundantes

Existem duas funções de análise no config.toml:
- `analyze-policy` (v7.0 - Gemini Vision)
- `analyze-policy-single` (v6.x - legado)

**Ação:** Verificar se `analyze-policy-single` ainda é utilizada. Se não, remover.

### 4. Consolidação da Arquitetura

```text
ANTES (v5.x):
┌────────────┐    ┌───────────────┐    ┌──────────────────────────┐
│  Frontend  │ → │ Edge Function │ → │     OCR.space            │
│            │    │ (proxy only)  │    │ (lento, caro, impreciso) │
└────────────┘    └───────────────┘    └──────────────────────────┘
       │
       ▼
┌────────────────────────────┐
│   universalPolicyParser.ts │
│   (937 linhas de regex)    │
└────────────────────────────┘

AGORA (v7.0):
┌────────────┐    ┌─────────────────────────────────────┐    ┌─────────────────┐
│  Frontend  │ → │ Edge Function (analyze-policy)      │ → │ Gemini Vision   │
│ (base64)   │    │ + Post-processing + Garbage Filter │    │ (instantâneo)   │
└────────────┘    └─────────────────────────────────────┘    └─────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │ JSON Estruturado + Limpo    │
                    │ (pronto para salvar no DB)  │
                    └─────────────────────────────┘
```

## Tarefas Técnicas

| # | Tarefa | Arquivo | Prioridade |
|---|--------|---------|------------|
| 1 | Deletar `universalPolicyParser.ts` | `src/utils/universalPolicyParser.ts` | Alta |
| 2 | Remover imports não utilizados | `src/services/policyImportService.ts` | Média |
| 3 | Verificar/remover `analyze-policy-single` | `supabase/functions/` | Média |
| 4 | Deploy final da Edge Function | `supabase/functions/analyze-policy` | Baixa (já feito) |

## Validação

Após implementação:
1. Testar upload de apólice Porto Seguro (PDF com texto)
2. Testar upload de apólice escaneada (imagem)
3. Verificar tempo de resposta: deve ser inferior a 5 segundos
4. Verificar que campos `nome_cliente` e `numero_apolice` não contêm "man ual"
5. Verificar matching de cliente via CPF no console

## Risco

**Baixo.** O fluxo principal já foi migrado e testado. As tarefas restantes são de limpeza/housekeeping.
