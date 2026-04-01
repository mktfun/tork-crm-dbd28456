# Spec 023: Roteamento de OCR Especializado de Apólices no Dispatcher

## 1. O Problema Atual
O Consultor IA na Spec 022 reclamou da "falta de dados do OCR" ("No momento, não tenho acesso a essas informações"). 
O diagnóstico apontou que a função `extract-document` atual no `admin-dispatcher` (que tenta fazer um OCR genérico brutal com Gemini) falhou, retornou vazio, e deixou a IA de mãos atadas.
Além disso, o usuário apontou estritamente que deseja usar o MESMO EXTRATOR já treinado e usado na "Importação de Apólices via IA" (`extract-quote-data`), deixando o extrator de OCR genérico (`extract-document`) apenas como *fallback* (último caso).

## 2. A Solução
Como o `extract-quote-data` já possui integração com o `Banco de Dados` (consulta clientes, seguradoras, converte tipos com fallback em Gemini), usaremos ele primeiro. Ele retornará um JSON perfeito extraído do PDF da apólice, fornecendo exatamente o tipo de dado que o Consultor Estratégico adoraria mastigar.

### Funcionalidades
1. **Ponte de Permissão Service Role**: A função `supabase/functions/extract-quote-data` usa `getUser(token)` diretamente, o que causaria quebra em chamadas automáticas de background (pois a requisição não tem token do browser, apenas Service Key). Precisamos injetar uma ponte condicional que aceite `userId` via body se a assinatura for a Chave de Serviço (`SUPABASE_SERVICE_ROLE_KEY`).
2. **Modificação no Dispatcher (`processAttachments`)**: Inserir uma cascata de invocação:
   - Primeiro `supabase.functions.invoke('extract-quote-data', { userId, fileUrl })`.
   - Se retornar um JSON validado, empacota ele limpo.
   - Se falhar ou der erro, despenca graciosamente para o `extract-document` existente.

## 3. Benefícios
- O Consultor de IA será municiado com os dados EXATAMENTE do jeito que o sistema enxerga (com Ramo, Franquia, Prêmios etc. mastigados em JSON).
- Zero alucinação visual: Os dados vêm tabulados em um dict.
- Se o PDF falhar, a cascata usa Gemini visualmente.

## 4. O Misterioso `ai_is_active: null` do Json
Foi analisado que o objeto gerado em memória no N8N despacha as chaves rigidamente configuradas como `true` antes do envio. Isso será rechecado. Pistas de que o N8N esteja parseando o Boolean mal (por causa de Set Nodes). Será reportado ao usuário.
