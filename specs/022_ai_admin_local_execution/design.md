# Design: App Executa, n8n Distribui (Spec 022)

## Arquitetura de Interseção
1. **O Gatilho:** Admin manda `/start` na janela de Batch.
2. O **`admin-dispatcher`** forma o `systemPrompt` especialista, MAS não o joga direto pro n8n executar.
3. O `admin-dispatcher` dispara um `Supabase.functions.invoke('ai-assistant')`! O Assistente de IA original do CRM entende o "Modo Consultivo", usa as Ferramentas (se necessário), processa o histórico extraído pelo OCR e elabora o Texto Final (The Pitch!).
4. O Retorno `text()` / `answer` gerado dentro da rede interna da Supabase é coletado pelo `admin-dispatcher`.
5. Agora sim, o Dispatcher atira o pacotinho pro Webhook do n8n: 
```json
{
  "action": "distribute_consultant_pitch",
  "generated_pitch": "# MENSAGEM FINAL\n...",
  "instructions_for_n8n_agent": "Aja como assistente de envio. Formate o texto contido em generated_pitch em formato WPP..."
}
```

## Mapa Racional
* Porque isso funciona? O LLM que opera dentro da Supabase (seja pelo ChatGPT ou Lovable Gateway) possui latências ultra-baixas operacionais junto do banco de dados (mesma VPC ou vizinhanças) e acessa TODAS as tools de listagem (ex: "search_client").
* Como a IA sabe que é para ser Consultiva? Como o Master-Prompt de "Pai de Família / Diferença de Preços" já é repassado no Payload que o `admin-dispatcher` faz ao invocar, a LLM no `ai-assistant` adotará esse avatar (Modo Híbrido).
