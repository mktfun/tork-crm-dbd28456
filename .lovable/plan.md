
Plano: confirmar para onde o batch está sendo enviado e blindar o debug do n8n

Diagnóstico já confirmado
- O `admin-dispatcher` realmente está fazendo `fetch()` e recebendo `200`.
- A URL resolvida para esse usuário hoje é:
  `https://n8n.tork.services/webhook/corretora1`
- O batch já está sendo enviado como mensagem normal (`message_type: 'text'`), então o problema não parece mais ser o tipo da mensagem.
- Há outro problema separado no OCR: o `extract-document` está falhando com `401 Invalid API key format`, então PDFs podem não estar entrando no contexto mesmo quando o batch dispara.

O que vou implementar
1. Melhorar o log do `admin-dispatcher`
- Logar explicitamente a URL final usada no dispatch do admin.
- Logar um resumo do payload enviado no batch:
  - `conversationId`
  - `original_content`
  - `message_type`
  - quantidade de textos/áudios/documentos acumulados
- Logar também um trecho do corpo da resposta do n8n, não só o status `200`.

2. Ajustar o `processBatchSession` para ficar rastreável
- Adicionar logs antes do envio com:
  - tamanho do `systemPrompt`
  - tamanho do `accumulatedContent`
  - contagem de itens acumulados
- Se o batch estiver vazio, logar isso claramente para não parecer que “sumiu”.

3. Validar consistência da URL do n8n
- Garantir no plano de implementação que o dispatch use e mostre sempre a URL resolvida de `crm_settings` antes do fallback para o secret global.
- Assim fica fácil verificar se você está olhando a execução do workflow certo no n8n.

4. Corrigir o OCR separado do fluxo batch
- Ajustar `extract-document` para usar uma chave válida no formato esperado.
- Sem isso, o batch pode até chegar ao n8n, mas vai chegar sem o texto do PDF, só com o contexto textual/manual.

Como isso resolve
- Se a fila do n8n continuar “vazia”, os novos logs vão mostrar exatamente qual webhook foi chamado e com qual resumo de payload.
- Se a URL estiver errada ou apontando para outro workflow, isso vai aparecer imediatamente.
- Se o webhook estiver respondendo `200` sem gerar execução visível, o corpo da resposta também vai ajudar a identificar se é um endpoint errado, proxy, teste ou workflow diferente.
- Em paralelo, o OCR corrigido garante que o conteúdo do PDF realmente entre no prompt do batch.

Arquivos envolvidos
- `supabase/functions/admin-dispatcher/index.ts`
- `supabase/functions/extract-document/index.ts`

Observação importante
- Pelo estado atual, o sinal mais forte não é “o batch não foi enviado”, e sim “foi enviado para uma URL que responde 200 mas não é a execução que você está observando”.
- Hoje a URL ativa do usuário no banco é `https://n8n.tork.services/webhook/corretora1`, então eu focaria o ajuste em deixar isso explícito nos logs e corrigir o OCR junto.
