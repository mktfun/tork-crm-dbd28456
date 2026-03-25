

# Plano: Responder antes de mover de etapa

## Problema

A ordem atual no `index.ts` é:

```text
1. Resolve deal (encontra deal no "Novo Lead")
2. Avalia objetivo → move pra "Em Contato"
3. Atualiza currentStage/stageAiSettings para "Em Contato"
4. Builda o prompt com as regras de "Em Contato"
5. Envia pro n8n → bot responde com prompt da etapa ERRADA
```

O cliente diz "pronto, respondi" e o bot já responde com o contexto da próxima etapa, ignorando o que aconteceu na etapa anterior. O cliente fica falando sozinho.

## Correção

Inverter a ordem: **primeiro responder com o prompt da etapa atual, depois avaliar e mover**.

```text
1. Resolve deal (encontra deal no "Novo Lead")
2. Build prompt com etapa ATUAL ("Novo Lead")
3. Dispatch pro n8n → bot responde no contexto certo
4. DEPOIS: avalia objetivo e move etapa se necessário
```

### Mudança no `index.ts`

Mover o bloco de avaliação de objetivo (step 6, linhas 172-203) para **depois** do dispatch ao n8n (step 9, linha 236). A avaliação continua acontecendo, mas o bot já terá respondido com o prompt correto da etapa atual.

O `objectiveResult` ainda será gerado e pode ser logado, mas não influencia mais o prompt da resposta atual. A transição de etapa fica como efeito colateral pós-resposta.

### Ajuste no payload do n8n

Como o `objectiveResult` agora será calculado depois do dispatch, o payload enviado ao n8n não terá mais essa info. Se o n8n precisar saber que houve transição, podemos enviar um segundo webhook leve ou simplesmente deixar o n8n consultar a etapa atualizada na próxima interação.

## Arquivo afetado

| Arquivo | Mudança |
|---|---|
| `index.ts` | Mover avaliação de objetivo para depois do dispatch ao n8n |

## Resultado esperado

- Cliente diz "pronto, respondi"
- Bot responde com prompt do "Novo Lead" (agradece, confirma)
- Avaliação roda em background → move pra "Em Contato"
- Na próxima mensagem, bot já opera com prompt de "Em Contato"

