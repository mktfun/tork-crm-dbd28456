const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = "https://jaouwhckqqnaxqyfvgyq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY || !GEMINI_API_KEY) {
  console.error("Erro: SUPABASE_SERVICE_ROLE_KEY e GOOGLE_AI_API_KEY são necessários.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const knowledgeBase = [
  {
    content: `A cobertura para veículos 4x4 e uso off-road (fora de estrada) possui particularidades importantes. A maioria das seguradoras tradicionais cobre o uso de veículos 4x4 em estradas de terra ou vias não pavimentadas, desde que sejam vias públicas reconhecidas. No entanto, danos ocorridos em trilhas pesadas, competições, travessia de rios ou locais de difícil acesso sem via pública podem ser excluídos. Quanto ao guincho, a assistência 24h geralmente atende em locais acessíveis por guinchos convencionais. Se o veículo estiver atolado em local de difícil acesso (lama profunda, areia, mata), a seguradora pode cobrar um valor adicional pelo resgate especial ou até recusar o atendimento se o risco não estiver previsto. É fundamental contratar coberturas específicas para uso off-road se esse for o perfil de uso do segurado.`,
    metadata: { source: "susep", category: "ramos", topic: "offroad_4x4" }
  }
];

async function generateEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
  const response = await axios.post(url, {
    model: 'models/text-embedding-004',
    content: { parts: [{ text }] },
    taskType: 'RETRIEVAL_DOCUMENT'
  });
  return response.data.embedding.values;
}

async function populate() {
  console.log("Iniciando população da base de conhecimento...");
  for (const item of knowledgeBase) {
    try {
      console.log(`Gerando embedding para: ${item.metadata.topic}`);
      const embedding = await generateEmbedding(item.content);
      
      const { error } = await supabase
        .from('ai_knowledge_base')
        .insert({
          content: item.content,
          metadata: item.metadata,
          embedding: embedding
        });

      if (error) throw error;
      console.log(`Sucesso: ${item.metadata.topic}`);
    } catch (err) {
      console.error(`Erro ao processar ${item.metadata.topic}:`, err.message);
    }
  }
}

populate();
