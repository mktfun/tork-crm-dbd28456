const fs = require('fs');
const path = './supabase/functions/chatwoot-dispatcher/index.ts';
let content = fs.readFileSync(path, 'utf8');

const oldStr = `    const prompt = \`Dado o contexto da mensagem do cliente e as opções disponíveis, escolha o melhor funil, etapa inicial e produto.

Mensagem: "\${messageContent}"

Funis disponíveis:
\${pipelinesText}

Produtos disponíveis:
\${productsText}

Responda APENAS com JSON: {"pipeline_id":"...","stage_id":"...","product_id":"..." ou null}
Use a primeira etapa (menor posição) do funil escolhido como stage_id.
Se não conseguir determinar o produto, use null.\`

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${LOVABLE_API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'Você é um classificador de leads para uma corretora de seguros. Responda apenas com JSON válido, sem markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      console.warn('⚠️ AI classification failed:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim() || ''

    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = text.match(/\\{[\\s\\S]*\\}/)
    if (!jsonMatch) return null`;

const newStr = `    const prompt = \`Dado o contexto da mensagem do cliente e as opções disponíveis, identifique se é possível determinar com clareza o funil e o produto desejado.

Mensagem: "\${messageContent}"

Funis disponíveis:
\${pipelinesText}

Produtos disponíveis:
\${productsText}

Regras rigorosas:
1. Se o cliente APENAS saudar (ex: "bom dia", "olá") ou pedir uma cotação genérica (ex: "preciso de uma cotação", "quero ver um seguro") SEM especificar o tipo de seguro/produto, você DEVE retornar null.
2. Se o cliente ESPECIFICAR o tipo de seguro ou produto (ex: "seguro residencial", "seguro auto", "plano de saúde", "seguro de vida"), retorne o JSON com os IDs correspondentes.
3. O JSON deve ter o formato exato: {"pipeline_id":"...","stage_id":"...","product_id":"..."}
4. Use a primeira etapa (menor posição) do funil escolhido como stage_id.
5. Responda APENAS com o JSON válido ou a palavra null. Não inclua markdown (\\\`\\\`\\\`json) nem explicações.\`

    const response = await fetch(AI_GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${LOVABLE_API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'Você é um classificador de leads para uma corretora de seguros. Responda apenas com JSON válido ou null, sem markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      console.warn('⚠️ AI classification failed:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content?.trim() || ''

    if (text === 'null' || text === 'NULL' || text === '') return null

    // Extract JSON from response (handle possible markdown wrapping)
    const jsonMatch = text.match(/\\{[\\s\\S]*\\}/)
    if (!jsonMatch) return null`;

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(path, content);
  console.log('Successfully patched!');
} else {
  console.log('Could not find the string to replace.');
}
