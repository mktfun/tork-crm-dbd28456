# Design - Consultor Especialista (Spec 021)

## Arquitetura: Dispatcher para N8N Agentico
A premissa exige que o modelo "Consultor de Alto Padrão" ganhe acesso a tools avançadas (`Buscar_Cotacoes_Atuais`, `Consultar_Rank_Seguradoras`, etc).
- Esses conectores de busca não são simples funções TypeScript — eles rodam em APIs terceiras ou queries do ERP que o **N8N** com sua IA Assistente gerencia de forma sublime.
- Portanto, *"dentro do app mesmo... e enviar pro n8n"* significa que o **modo de preparo (OCR, Agrupamento de PDFs, Trigger do /start)** continua nativo no Supabase. O Supabase mastigará tudo e moldará o *Master Prompt* fornecido na "Identity do Backoffice de Venda".

## Fluxo Lógico (A Engenharia do Prompt)
Quando o `admin-dispatcher` constatar `mode: 'analise'` (via tabela de sessions), em vez de repassar a instrução boba *"Analise as imagens e pdfs que mandei"*, ele injetará uma formatação gigantesca de System Prompt contendo as seções:

1. `<ROLE>`: Consultor de Seguro Backoffice
2. `<PROFILING>`: Jovem Empresário vs Pai de Família
3. `<CRITICAL_STEPS>`:
   1. Quebra-Gelo (frase rígida exigida)
   2. Busca por Brechas (Exclusões, Limites, Perfil)
   3. Tabela Preço vs Rank (acessando as tools de Cotação de Mercado)
   4. SPIN Selling (microcompromissos do fechamento)
   5. Call to Action Exata.
4. `<RESTRICTIONS>`: Sem Venda Casada, Sem Jargão, Foco na Consultoria.

### Ferramentas Mapeadas:
Na `payload` para o N8N, a propriedade `allowed_tools` enviada pelo Dispatcher receberá a injeção extra dessas 3 competências que o workflow do N8N deve possuir na ponta dele:
1. `Analisar_Documento_OCR`: (Já resolvido nativamente no Payload pré-processado pela Supabase via extract-document — a IA receberá o texto final já mastigado e não precisará chamar tool para ver).
2. `Buscar_Cotacoes_Atuais`: O N8N AI Node fará o fetch para simular as 3 cotações de concorrência.
3. `Consultar_Rank_Seguradoras`: O N8N cruzará os "Preços vs Segurança" para sugerir a venda por Rank 1 (se a diferença de preço bater a fita descrita na regra lógica de 500 a 1000 reais).

## Relacionamento: N8N
O JSON despachado será marcado como `action: "ai_consultant_pitch"`, indicando para o N8N que ele DEVE descartar as personas tradicionais e engrenar imediatamente na formatação "Quebra Gelo → Desconstrução → Preços → Fechamento" para ser lido no CRM ou redirecionado ao Vendedor via Whatsapp.
