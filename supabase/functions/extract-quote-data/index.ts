import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Modelos do Gemini a tentar (com fallback)
const MODELS_TO_TRY = ['gemini-2.0-flash', 'gemini-1.5-flash'];

// ============= FUNÇÕES AUXILIARES =============

/**
 * Busca contexto do banco de dados (clientes, seguradoras e ramos)
 */
async function fetchDatabaseContext(supabaseAdmin: any, userId: string) {
  const [
    { data: clients },
    { data: companies },
    { data: ramos }
  ] = await Promise.all([
    supabaseAdmin.from('clientes').select('id, name, email, phone, cpf_cnpj').eq('user_id', userId),
    supabaseAdmin.from('companies').select('id, name').eq('user_id', userId),
    supabaseAdmin.from('ramos').select('id, nome').eq('user_id', userId),
  ]);

  return {
    clients: clients || [],
    companies: companies || [],
    ramos: ramos || [],
  };
}

/**
 * Baixa PDF do Storage e converte para Base64
 */
async function downloadPdfAsBase64(supabaseAdmin: any, fileUrl: string): Promise<string> {
  const urlParts = new URL(fileUrl);
  const filePath = urlParts.pathname.split('/object/public/quote-uploads/')[1];

  if (!filePath) {
    throw new Error('Caminho do arquivo inválido na URL');
  }

  console.log('📥 Baixando PDF do Storage:', filePath);

  const { data: pdfBlob, error } = await supabaseAdmin.storage
    .from('quote-uploads')
    .download(filePath);

  if (error || !pdfBlob) {
    throw new Error(`Erro ao baixar PDF: ${error?.message}`);
  }

  const arrayBuffer = await pdfBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const base64 = btoa(bytes.reduce((data, byte) => data + String.fromCharCode(byte), ''));
  
  console.log(`✅ PDF convertido (${Math.round(base64.length / 1024)}KB)`);
  return base64;
}

/**
 * Constrói o prompt para o Gemini com contexto do banco
 */
function buildPrompt(dbContext: any): string {
  return `Você é um assistente de IA especialista em extrair dados de apólices e orçamentos de seguro em PDF.

Sua tarefa é ler o PDF fornecido e extrair as informações solicitadas. Você DEVE retornar sua resposta APENAS como um objeto JSON válido, sem nenhum outro texto, explicação ou marcadores de código.

**REGRAS IMPORTANTES:**
1. **JSON ESTRITO:** Retorne APENAS o objeto JSON.
2. **CAMPOS NÃO ENCONTRADOS:** Se uma informação não for encontrada, use \`null\` para aquele campo.
3. **PRIORIDADE DE NÚMERO:**
   * Tente primeiro encontrar o "Número da Apólice".
   * Se não achar, tente encontrar o "Número da Proposta".
   * Se não achar, tente encontrar o "Número do Orçamento".
4. **DATAS:** Formate todas as datas como \`YYYY-MM-DD\`.
5. **VALORES:** Retorne apenas números (ex: 1500.00, não "R$ 1.500,00").
6. **PERCENTUAIS:** Retorne apenas números (ex: 20, não "20%").

**CLIENTES EXISTENTES (use o nome EXATO se corresponder):**
${dbContext.clients.map((c: any) => `- ${c.name} (${c.email || c.phone || 'N/A'})`).join('\n')}

**SEGURADORAS EXISTENTES (use o nome EXATO se corresponder):**
${dbContext.companies.map((c: any) => `- ${c.name}`).join('\n')}

**RAMOS EXISTENTES (use o nome EXATO se corresponder):**
${dbContext.ramos.map((r: any) => `- ${r.nome}`).join('\n')}

**ESTRUTURA JSON DE SAÍDA:**
{
  "clientName": "string | null",
  "clientEmail": "string | null",
  "clientPhone": "string | null",
  "clientCpfCnpj": "string | null",
  "insurerName": "string | null",
  "ramoName": "string | null",
  "policyNumber": "string | null",
  "proposalNumber": "string | null",
  "quoteNumber": "string | null",
  "insuredItem": "string | null",
  "itemBrand": "string | null",
  "itemModel": "string | null",
  "itemYear": "string | null",
  "premiumValue": "number | null",
  "commissionPercentage": "number | null",
  "startDate": "string | null",
  "endDate": "string | null"
}`;
}

// ======== Normalização de RAMO (sinônimos e keywords) =========
const RAMO_KEYWORDS: Record<string, string[]> = {
  auto: ['auto','automovel','automóvel','veiculo','veículo','moto','motocicleta','caminhao','caminhão','frota','carro'],
  'saúde': ['saude','saúde','medico','médico','hospital','plano','odonto','odontologico','odontológico','health'],
  vida: ['vida','acidentes pessoais','ap','funeral','life'],
  residencial: ['residencial','residencia','residência','casa','apartamento','imovel','imóvel','condominio','condomínio','home'],
  empresarial: ['empresarial','empresa','comercial','business','rc','responsabilidade civil','estabelecimento'],
  consorcio: ['consorcio','consórcio','consortium'],
  'previdência': ['previdencia','previdência','vgbl','pgbl','aposentadoria','pension'],
  viagem: ['viagem','travel','trip','turismo'],
  rural: ['rural','agricola','agrícola','fazenda','plantacao','plantação','colheita'],
  transporte: ['transporte','carga','frete','transportadora','caminhao','caminhão'],
  fianca: ['fianca','fiança','aluguel','locacao','locação','rent'],
  garantia: ['garantia','warranty','garantia estendida'],
  pet: ['pet','animal','cachorro','gato','dog','cat']
};

function normalizeText(input?: string | null) {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function findBestRamoKeyFromText(text: string): string | null {
  const norm = normalizeText(text);
  let bestKey: string | null = null;
  let bestScore = 0;
  for (const [key, kws] of Object.entries(RAMO_KEYWORDS)) {
    let score = 0;
    // Bônus se o próprio nome da chave aparece
    if (norm.includes(key)) score += 5;
    for (const kw of kws) {
      if (norm.includes(kw)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestScore > 0 ? bestKey : null;
}

function findBestRamoId(rawData: any, dbContext: any): { id: string; match: 'exact' | 'keyword' } | null {
  const candidates = [rawData?.ramoName, rawData?.insuredItem, rawData?.itemModel, rawData?.itemBrand]
    .filter(Boolean) as string[];
  // 1) Tenta match exato por nome
  const rdName = normalizeText(rawData?.ramoName);
  if (rdName) {
    const exact = dbContext.ramos.find((r: any) => normalizeText(r.nome) === rdName);
    if (exact) return { id: exact.id, match: 'exact' };
  }
  // 2) Tenta por keywords
  const combinedText = candidates.join(' | ');
  const ramoKey = findBestRamoKeyFromText(combinedText);
  if (ramoKey) {
    // Procura um ramo cujo nome contenha a chave
    const byKey = dbContext.ramos.find((r: any) => normalizeText(r.nome).includes(normalizeText(ramoKey)));
    if (byKey) return { id: byKey.id, match: 'keyword' };
  }
  return null;
}

/**
 * Chama o Gemini com um modelo específico
 */
async function extractWithModel(
  modelName: string,
  pdfBase64: string,
  prompt: string,
  apiKey: string
) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  
  console.log(`🤖 Tentando modelo: ${modelName}`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            clientName: { type: 'string', nullable: true },
            clientEmail: { type: 'string', nullable: true },
            clientPhone: { type: 'string', nullable: true },
            clientCpfCnpj: { type: 'string', nullable: true },
            insurerName: { type: 'string', nullable: true },
            ramoName: { type: 'string', nullable: true },
            policyNumber: { type: 'string', nullable: true },
            proposalNumber: { type: 'string', nullable: true },
            quoteNumber: { type: 'string', nullable: true },
            insuredItem: { type: 'string', nullable: true },
            itemBrand: { type: 'string', nullable: true },
            itemModel: { type: 'string', nullable: true },
            itemYear: { type: 'string', nullable: true },
            premiumValue: { type: 'number', nullable: true },
            commissionPercentage: { type: 'number', nullable: true },
            startDate: { type: 'string', nullable: true },
            endDate: { type: 'string', nullable: true },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${modelName}): ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const extractedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!extractedText) {
    throw new Error('Gemini não retornou dados');
  }

  return JSON.parse(extractedText);
}

/**
 * Extrai dados do PDF usando Gemini (com fallback)
 */
async function extractDataWithGemini(pdfBase64: string, dbContext: any, apiKey: string) {
  const prompt = buildPrompt(dbContext);
  let lastError: Error | null = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      const rawData = await extractWithModel(modelName, pdfBase64, prompt, apiKey);
      console.log(`✅ Sucesso com: ${modelName}`);
      return rawData;
    } catch (error: unknown) {
      console.log(`⚠️ Falha com ${modelName}:`, error instanceof Error ? error.message : 'Unknown error');
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
  }

  throw new Error(`Falha após tentar ${MODELS_TO_TRY.length} modelos. Último erro: ${lastError?.message}`);
}

/**
 * Lógica de negócio: transformar dados brutos em dados de formulário
 */
async function processExtractedData(rawData: any, dbContext: any, supabaseAdmin: any, userId: string) {
  console.log('🔄 Processando dados extraídos...');
  
  // ============= CLIENTE (FIND OR CREATE) =============
  let clientId = null;
  let clientMatch = 'none';
  
  // Tenta encontrar cliente existente
  const clientFound = dbContext.clients.find((c: any) => 
    (rawData.clientEmail && c.email?.toLowerCase() === rawData.clientEmail.toLowerCase()) ||
    (rawData.clientPhone && c.phone === rawData.clientPhone) ||
    (rawData.clientCpfCnpj && c.cpf_cnpj === rawData.clientCpfCnpj)
  );

  if (clientFound) {
    clientId = clientFound.id;
    clientMatch = 'exact';
    console.log(`✅ Cliente encontrado: ${clientFound.name}`);
  } else if (rawData.clientName) {
    // Cria novo cliente
    console.log(`🆕 Criando novo cliente: ${rawData.clientName}`);
    const { data: newClient, error } = await supabaseAdmin
      .from('clientes')
      .insert({
        user_id: userId,
        name: rawData.clientName,
        email: rawData.clientEmail || '',
        phone: rawData.clientPhone || '',
        cpf_cnpj: rawData.clientCpfCnpj,
        status: 'Ativo',
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erro ao criar cliente:', error);
      throw new Error(`Erro ao criar cliente: ${error.message}`);
    }

    clientId = newClient.id;
    clientMatch = 'created';
    console.log(`✅ Cliente criado: ${newClient.id}`);
  }

  // ============= NÚMERO DA APÓLICE (PRIORIDADE) =============
  const policyNumber = rawData.policyNumber || rawData.proposalNumber || rawData.quoteNumber || null;

  // ============= BEM SEGURADO (FORMATAÇÃO) =============
  const parts = [
    rawData.ramoName,
    rawData.itemBrand,
    rawData.itemModel,
    rawData.itemYear
  ].filter(Boolean);
  
  let insuredItem = rawData.insuredItem || parts.join(' - ');
  
  // Remove hífens soltos
  insuredItem = insuredItem.replace(/^\s*-\s*|-\s*$/g, '').trim() || 'Não especificado';

  // ============= SEGURADORA (MATCHING) =============
  let insurerId = null;
  let insurerMatch = 'none';
  
  if (rawData.insurerName) {
    const insurerFound = dbContext.companies.find((c: any) =>
      c.name.toLowerCase() === rawData.insurerName.toLowerCase()
    );
    
    if (insurerFound) {
      insurerId = insurerFound.id;
      insurerMatch = 'exact';
      console.log(`✅ Seguradora encontrada: ${insurerFound.name}`);
    }
  }

  // ============= RAMO (MATCHING + NORMALIZAÇÃO) =============
  let ramoId = null;
  let ramoMatch: 'none' | 'exact' | 'keyword' = 'none';
  
  const ramoResult = findBestRamoId(rawData, dbContext);
  if (ramoResult) {
    ramoId = ramoResult.id;
    ramoMatch = ramoResult.match;
    console.log(`✅ Ramo identificado (${ramoMatch})`);
  }

  // ============= DATAS (VIGÊNCIA DE 1 ANO) =============
  let startDate = rawData.startDate;
  let endDate = rawData.endDate;

  if (startDate && !endDate) {
    const start = new Date(startDate);
    start.setFullYear(start.getFullYear() + 1);
    start.setDate(start.getDate() - 1);
    endDate = start.toISOString().split('T')[0];
    console.log(`📅 Data final calculada: ${endDate}`);
  }

  // ============= RETORNAR DADOS PROCESSADOS =============
  return {
    // Dados do formulário
    clientId,
    insuredAsset: insuredItem,
    status: 'Orçamento',
    insuranceCompany: insurerId,
    type: ramoId,
    policyNumber,
    premiumValue: rawData.premiumValue,
    commissionRate: rawData.commissionPercentage || 20,
    startDate,
    expirationDate: endDate,
    automaticRenewal: true,
    
    // Metadados de matching
    matching: {
      client: clientMatch,
      insurer: insurerMatch,
      ramo: ramoMatch,
    },
    
    // Nomes extraídos (para exibição)
    extractedNames: {
      clientName: rawData.clientName,
      insurerName: rawData.insurerName,
      ramoName: rawData.ramoName,
    },
  };
}

// ============= SERVIDOR PRINCIPAL =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY não configurada');
    }

    // Obter dados da requisição
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header não encontrado');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Obter usuário autenticado ou permitir Service Role Request
    const token = authHeader.replace('Bearer ', '');
    
    // Ler o body antecipadamente para extrair fileUrl e userId (útil no modo de serviço)
    const reqBody = await req.json();
    const { fileUrl, userId: bodyUserId } = reqBody;

    if (!fileUrl) {
      throw new Error('fileUrl é obrigatório');
    }

    let userId = '';

    if (token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') && bodyUserId) {
      // Background execution via internal invoke
      userId = bodyUserId;
    } else {
      // Normal browser execution
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }
      userId = user.id;
    }

    console.log('📄 Processando PDF:', fileUrl);

    // 1. Baixar PDF
    const pdfBase64 = await downloadPdfAsBase64(supabaseAdmin, fileUrl);

    // 2. Buscar contexto do DB
    const dbContext = await fetchDatabaseContext(supabaseAdmin, userId);
    console.log(`✅ Contexto: ${dbContext.clients.length} clientes, ${dbContext.companies.length} seguradoras, ${dbContext.ramos.length} ramos`);

    // 3. Extrair dados com Gemini
    const rawData = await extractDataWithGemini(pdfBase64, dbContext, GOOGLE_AI_API_KEY);

    // 4. Processar dados (lógica de negócio)
    const processedData = await processExtractedData(rawData, dbContext, supabaseAdmin, userId);

    // 5. Persistir PDF no bucket privado 'policy-docs' e remover temporário
    try {
      const tempFilePath = new URL(fileUrl).pathname.split('/object/public/quote-uploads/')[1];
      const originalFileName = tempFilePath?.split('/')?.pop() || `arquivo.pdf`;

      // Reconstroi Blob a partir do base64
      const byteChars = atob(pdfBase64);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
      const byteArray = new Uint8Array(byteNumbers);
      const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });

      const destPath = `${userId}/${Date.now()}-${originalFileName}`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from('policy-docs')
        .upload(destPath, pdfBlob, { contentType: 'application/pdf', upsert: false });

      if (uploadErr) throw new Error(`Falha ao salvar PDF definitivo: ${uploadErr.message}`);

      // URL assinada para uso imediato no app (7 dias)
      const { data: signedData, error: signedErr } = await supabaseAdmin.storage
        .from('policy-docs')
        .createSignedUrl(destPath, 60 * 60 * 24 * 7);

      if (signedErr) {
        console.warn('Não foi possível gerar URL assinada:', signedErr.message);
      }

      // Anexa info do PDF ao payload
      (processedData as any).pdf_url = destPath;
      (processedData as any).pdf = {
        bucket: 'policy-docs',
        path: destPath,
        signedUrl: signedData?.signedUrl || null,
      };

      if (tempFilePath) {
        await supabaseAdmin.storage.from('quote-uploads').remove([tempFilePath]);
        console.log('🗑️ Arquivo temporário removido');
      }
      console.log('📦 PDF persistido em policy-docs:', destPath);
    } catch (e) {
      console.error('⚠️ Falha ao persistir PDF definitivo; mantendo upload temporário', e);
      // Mantém o arquivo temporário e devolve dados mínimos
      const tempFilePath = new URL(fileUrl).pathname.split('/object/public/quote-uploads/')[1];
      (processedData as any).pdf_url = tempFilePath ? `quote-uploads/${tempFilePath}` : fileUrl;
      (processedData as any).pdf = {
        bucket: 'quote-uploads',
        path: tempFilePath || null,
        signedUrl: null,
      };
    }

    console.log('✅ Processamento concluído:', processedData);

    return new Response(
      JSON.stringify({ success: true, data: processedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
