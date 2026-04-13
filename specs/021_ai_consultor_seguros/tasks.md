# Checklist AI Consultor Especialista (Spec 021)

## Etapas da Implementação (Dispatcher -> N8N)
- [x] Ler o arquivo `supabase/functions/admin-dispatcher/index.ts`.
- [x] Identificar a função `processBatchSession` ou a rota ativada pelo comando `/start`.
- [x] Criar o injetor de Prompt: se o originador for o `/start` do modo `/analise`, substituir o System Prompt padrão do Assistant Tork por uma variação brutal "Expert_Insurance_Consultant" gerada a partir das especificações (`Quebra-Gelo, Spin Selling, Desconstrução`).
- [x] Integrar no Payload N8N ferramentas que a IA possa usar (adicionando `Buscar_Cotacoes_Atuais` e `Consultar_Rank_Seguradoras` no array de `allowed_tools` do dispatcher).
- [x] Enviar os documentos transcritos e a Identity injetada na variavel "action" como `ai_consultant_pitch`.
- [x] Revisar a formatação de prompts para garantir que a IA obedeça as Restrições Finais exigidas de NÃO inventar, traduzir segurês, não atacar a concorrência nem fazer venda casada.
- [x] Opcional/Recomendado: Fornecer ao usuário (N8N dev) um Snippet (JSON ou Markdown) contendo a arquitetura mínima do Node do N8N para ele ligar o Webhook à LLM de Consultoria com a ferramenta de cotações que ele diz "já ter feito".
