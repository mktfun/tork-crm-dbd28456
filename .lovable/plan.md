

# Plano: Limpar System Prompt do Dispatcher (remover tools obsoletas, corrigir triagem)

## Problemas Identificados

### 1. `<tools_manual>` obsoleto (linhas 589-595)
O dispatcher agora faz auto-criação de deal e progressão de etapa internamente. O prompt ainda lista 5 tools (`search_contact`, `create_contact`, `list_pipelines_and_stages`, `create_deal`, `update_deal_stage`) como se a IA precisasse chamá-las. **Nenhuma dessas é necessária no prompt de vendas** — o dispatcher já cuida de tudo.

### 2. Prompt sem deal (linhas 597-606) — foco errado
Quando `!deal` (cliente não cadastrado), o prompt diz "crie o contato com create_contact". Mas o objetivo real deveria ser **triagem**: entender o que o cliente precisa ("cotação auto", "sinistro", "endosso", "consórcio") para que na próxima mensagem o dispatcher classifique corretamente com IA e crie o deal no pipeline certo.

### 3. `<auto_progression>` (linhas 640-651) — redundante
O dispatcher já faz `evaluateObjectiveCompletion` internamente. O prompt ainda manda a IA usar `update_deal_stage`, duplicando a lógica e podendo causar conflitos.

### 4. `allowedTools` (linhas 606, 667) — expõe tools desnecessárias
Tanto no modo sem-deal quanto com-deal, expõe tools que o dispatcher já executa.

## Correções no `buildSystemPrompt`

### A. Remover `<tools_manual>` inteiro (linhas 589-595)
Não é mais necessário no modo vendas. O n8n/IA não precisa saber dessas tools.

### B. Reescrever bloco sem-deal (linhas 597-606)
Novo objetivo: **triagem conversacional**. A IA deve:
- Cumprimentar o cliente
- Entender o que ele precisa (cotação, sinistro, endosso, cancelamento, etc.)
- Fazer perguntas curtas para captar o interesse
- NÃO mencionar criação de contato, deal, ou tools

```
<objective>
NOVO CONTATO — TRIAGEM INICIAL
Este cliente ainda não tem negociação. Seu objetivo é entender o que ele precisa.
Pergunte de forma natural o que ele está buscando (cotação, sinistro, endosso, cancelamento, etc.).
NÃO tente vender nada ainda. Apenas identifique a necessidade para encaminhamento correto.
O sistema cuidará automaticamente do cadastro e roteamento.
</objective>
```

### C. Remover `<auto_progression>` (linhas 640-651)
O dispatcher já move o deal automaticamente. Remover esse bloco evita que a IA tente fazer o mesmo via tool.

### D. Simplificar `allowedTools`
- Sem deal: `[]` (vazio — IA só conversa)
- Com deal: `[]` (vazio — dispatcher cuida de tudo)
- Admin: manter como está

### E. Manter `<objective>` do deal com etapa
O bloco que injeta `stageAiSettings.ai_objective` (linha 618) está correto — é o objetivo configurado pelo usuário para aquela etapa. Manter.

## Arquivo afetado

| Arquivo | Ação |
|---|---|
| `supabase/functions/chatwoot-dispatcher/index.ts` | Limpar tools_manual, reescrever prompt de triagem, remover auto_progression |

