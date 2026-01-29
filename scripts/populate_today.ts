/**
 * Script para popular a base de conhecimento do RAG com dados de seguros
 * 
 * Uso: deno run --allow-env --allow-net scripts/populate_today.ts
 */

const SUPABASE_URL = "https://jaouwhckqqnaxqyfvgyq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphb3V3aGNrcXFuYXhxeWZ2Z3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzQyNTksImV4cCI6MjA2Nzc1MDI1OX0.lQ72wQeKL9F9L9T-1kjJif7SEY_cHYFI7rM-uXN5ARc";

// Base de conhecimento de seguros - Normas SUSEP e termos técnicos
const knowledgeBase = [
  // === CONCEITOS BÁSICOS DE SEGUROS ===
  {
    content: `O seguro é um contrato pelo qual o segurador se obriga, mediante o pagamento do prêmio, a garantir interesse legítimo do segurado, relativo a pessoa ou a coisa, contra riscos predeterminados. O prêmio é o valor pago pelo segurado à seguradora para ter direito à cobertura contratada. A apólice é o documento que formaliza o contrato de seguro, contendo todas as condições gerais, especiais e particulares.`,
    metadata: { source: "susep", category: "conceitos_basicos", topic: "definicao_seguro" }
  },
  {
    content: `O sinistro é a ocorrência do risco coberto durante o período de vigência do plano de seguro. É o evento que causa dano ou perda ao segurado e que está previsto nas condições contratuais. Quando ocorre um sinistro, o segurado deve comunicar imediatamente à seguradora e fornecer toda documentação necessária para análise e eventual indenização.`,
    metadata: { source: "susep", category: "conceitos_basicos", topic: "sinistro" }
  },
  {
    content: `A franquia é a participação obrigatória do segurado nos prejuízos resultantes de sinistro. É o valor que o segurado paga do próprio bolso antes que a seguradora assuma o restante. Existem dois tipos: franquia simples (dedutível) onde a seguradora paga a diferença entre o prejuízo e a franquia, e franquia dedutível onde a franquia é sempre descontada do valor da indenização.`,
    metadata: { source: "susep", category: "conceitos_basicos", topic: "franquia" }
  },
  {
    content: `O Valor de Mercado Referenciado (VMR) é o valor médio de mercado de um veículo, calculado com base em pesquisas de preços. A Tabela FIPE é a referência mais utilizada no Brasil. Em caso de perda total, a indenização será calculada com base no VMR constante na apólice, deduzida a franquia quando aplicável.`,
    metadata: { source: "susep", category: "conceitos_basicos", topic: "valor_mercado" }
  },

  // === RAMOS DE SEGUROS ===
  {
    content: `O seguro de Automóvel (ramo 531) cobre danos ao veículo segurado causados por colisão, incêndio, roubo, furto, fenômenos naturais e outros eventos previstos na apólice. Coberturas típicas incluem: Casco (danos ao veículo), RCF-V (responsabilidade civil facultativa veículos), APP (acidentes pessoais de passageiros), e assistência 24h.`,
    metadata: { source: "susep", category: "ramos", topic: "automovel" }
  },
  {
    content: `A cobertura RCF-V (Responsabilidade Civil Facultativa de Veículos) protege o segurado contra danos materiais e/ou corporais causados a terceiros em acidentes de trânsito. É uma cobertura facultativa mas altamente recomendada, pois o DPVAT (seguro obrigatório) possui limites baixos de indenização. O sinistro de RCF-V ocorre quando o segurado causa danos a terceiros em um acidente de trânsito.`,
    metadata: { source: "susep", category: "ramos", topic: "rcfv" }
  },
  {
    content: `O seguro Residencial cobre danos ao imóvel e seu conteúdo contra incêndio, raio, explosão, roubo, furto, danos elétricos, vendaval, alagamento e outros riscos. Coberturas adicionais podem incluir: responsabilidade civil familiar, vidros, vazamento de tubulações, e assistência residencial 24h com serviços de chaveiro, eletricista e encanador.`,
    metadata: { source: "susep", category: "ramos", topic: "residencial" }
  },
  {
    content: `O seguro Empresarial protege estabelecimentos comerciais e industriais contra diversos riscos como incêndio, roubo, danos elétricos e responsabilidade civil. Coberturas específicas podem incluir: lucros cessantes (perda de receita durante paralisação), equipamentos, mercadorias em estoque, e responsabilidade civil do empregador.`,
    metadata: { source: "susep", category: "ramos", topic: "empresarial" }
  },
  {
    content: `O seguro de Vida Individual oferece proteção financeira aos beneficiários em caso de morte do segurado. Coberturas típicas incluem: morte natural ou acidental, invalidez permanente total ou parcial por acidente (IPA), invalidez funcional permanente total por doença (IFPD), doenças graves, e diárias por incapacidade temporária.`,
    metadata: { source: "susep", category: "ramos", topic: "vida" }
  },
  {
    content: `O seguro de Saúde e os Planos de Saúde são regulados pela ANS (Agência Nacional de Saúde Suplementar), não pela SUSEP. Entretanto, seguros de acidentes pessoais e diárias de incapacidade são regulados pela SUSEP. É importante distinguir entre seguro saúde (indenização) e plano de saúde (prestação de serviços).`,
    metadata: { source: "susep", category: "ramos", topic: "saude" }
  },
  {
    content: `O seguro de Responsabilidade Civil Profissional (RC Profissional ou E&O - Errors and Omissions) protege profissionais liberais como médicos, advogados, engenheiros, contadores e corretores contra reclamações de terceiros por erros, omissões ou negligência no exercício de suas atividades profissionais.`,
    metadata: { source: "susep", category: "ramos", topic: "rc_profissional" }
  },
  {
    content: `O seguro Garantia é utilizado para garantir o cumprimento de obrigações contratuais. Modalidades incluem: garantia de licitação (bid bond), garantia de execução (performance bond), garantia de adiantamento de pagamento, e garantia judicial. É muito utilizado em contratos públicos e grandes obras.`,
    metadata: { source: "susep", category: "ramos", topic: "garantia" }
  },

  // === REGULAMENTAÇÃO SUSEP ===
  {
    content: `A SUSEP (Superintendência de Seguros Privados) é a autarquia federal responsável pela fiscalização e regulamentação do mercado de seguros, previdência complementar aberta, capitalização e resseguro no Brasil. A SUSEP está vinculada ao Ministério da Fazenda e tem como missão proteger os direitos dos consumidores e zelar pela liquidez e solvência das empresas supervisionadas.`,
    metadata: { source: "susep", category: "regulamentacao", topic: "susep" }
  },
  {
    content: `O corretor de seguros é o profissional legalmente habilitado pela SUSEP para intermediar contratos de seguro entre segurados e seguradoras. Para atuar, o corretor pessoa física deve ser aprovado no exame da SUSEP e registrado. A corretora pessoa jurídica deve ter um corretor responsável técnico habilitado. O corretor tem o dever de orientar o cliente sobre as coberturas mais adequadas às suas necessidades.`,
    metadata: { source: "susep", category: "regulamentacao", topic: "corretor" }
  },
  {
    content: `A Circular SUSEP 621/2020 estabelece regras para comercialização de seguros à distância e meios remotos. Permite a contratação digital de seguros, desde que garantidos: identificação do cliente, disponibilização das condições contratuais, confirmação de contratação, e direito de arrependimento em 7 dias. Também regulamenta o uso de assinatura eletrônica.`,
    metadata: { source: "susep", category: "regulamentacao", topic: "circular_621" }
  },
  {
    content: `A Resolução CNSP 382/2020 dispõe sobre as regras e critérios para operação do seguro popular, que são produtos simplificados com coberturas básicas e prêmios acessíveis. O objetivo é ampliar o acesso ao seguro para a população de menor renda. Os produtos de seguro popular têm processos simplificados de contratação e regulação de sinistros.`,
    metadata: { source: "susep", category: "regulamentacao", topic: "seguro_popular" }
  },

  // === CÁLCULO DE COMISSÕES E PRÊMIOS ===
  {
    content: `A comissão do corretor de seguros é um percentual sobre o prêmio líquido pago pelo segurado. Os percentuais variam por ramo: Automóvel (10-20%), Residencial (20-35%), Vida (30-50%), Empresarial (15-25%), Saúde (5-15%). A comissão é paga pela seguradora ao corretor, não sendo cobrada adicionalmente do cliente.`,
    metadata: { source: "susep", category: "comercial", topic: "comissao" }
  },
  {
    content: `O cálculo do prêmio de seguro considera diversos fatores de risco. Para automóvel: perfil do condutor (idade, sexo, estado civil), região de circulação e pernoite, modelo e ano do veículo, bônus por ausência de sinistros. Para residencial: localização, tipo de construção, valor dos bens. A precificação atuarial busca equilibrar o custo do risco com a competitividade comercial.`,
    metadata: { source: "susep", category: "comercial", topic: "precificacao" }
  },
  {
    content: `O IOF (Imposto sobre Operações Financeiras) incide sobre os prêmios de seguro. As alíquotas são: 7,38% para seguros de danos (automóvel, residencial, empresarial), 0,38% para seguros de vida e acidentes pessoais, 0% para seguros de exportação e transporte internacional. O IOF é recolhido pela seguradora e já está incluído no valor do prêmio total.`,
    metadata: { source: "susep", category: "comercial", topic: "iof" }
  },

  // === PROCESSO DE SINISTROS ===
  {
    content: `O prazo para comunicar um sinistro à seguradora é geralmente de até 3 dias úteis após a ocorrência ou conhecimento do evento. Para sinistros de roubo ou furto de veículos, é obrigatório registrar Boletim de Ocorrência policial. A documentação básica inclui: comunicação de sinistro, cópia dos documentos do segurado e do bem, fotos e orçamentos quando aplicável.`,
    metadata: { source: "susep", category: "sinistros", topic: "comunicacao" }
  },
  {
    content: `A regulação de sinistros é o processo de análise pela seguradora para verificar a cobertura contratada, as circunstâncias do evento e o valor da indenização. O prazo máximo para pagamento da indenização é de 30 dias após a entrega de toda documentação exigida. Em caso de sinistro complexo, a seguradora pode solicitar vistoria técnica ou peritagem.`,
    metadata: { source: "susep", category: "sinistros", topic: "regulacao" }
  },
  {
    content: `A perda total de um veículo ocorre quando os reparos necessários excedem 75% do valor segurado (limite definido pelas seguradoras). Neste caso, a indenização é integral, com dedução da franquia quando aplicável. O salvado (veículo danificado) pode ser leiloado pela seguradora ou adquirido pelo próprio segurado com desconto na indenização.`,
    metadata: { source: "susep", category: "sinistros", topic: "perda_total" }
  },

  // === RENOVAÇÃO E CANCELAMENTO ===
  {
    content: `A renovação do seguro deve ser solicitada antes do vencimento da apólice atual. O bônus (desconto por ausência de sinistros) é um benefício acumulativo, geralmente de 5% ao ano, podendo chegar a até 35% em algumas seguradoras. Na renovação, o corretor deve reavaliar as necessidades do cliente e propor as coberturas mais adequadas.`,
    metadata: { source: "susep", category: "comercial", topic: "renovacao" }
  },
  {
    content: `O cancelamento do seguro pode ocorrer por solicitação do segurado ou da seguradora. Em caso de cancelamento antes do vencimento, o segurado tem direito à restituição proporcional do prêmio não utilizado (pro-rata). A seguradora pode cancelar o contrato por falta de pagamento, agravamento de risco ou declarações inexatas do segurado.`,
    metadata: { source: "susep", category: "comercial", topic: "cancelamento" }
  },

  // === ASSISTÊNCIA 24H ===
  {
    content: `A Assistência 24 horas é um serviço adicional incluído na maioria dos seguros de automóvel e residencial. Para veículos, inclui: socorro mecânico, guincho, chaveiro, troca de pneus, pane seca, e hospedagem em caso de viagem. Para residências: eletricista, encanador, chaveiro, vidraceiro, e desentupidor. Os limites e franquias de utilização variam por seguradora.`,
    metadata: { source: "susep", category: "servicos", topic: "assistencia_24h" }
  },
  {
    content: `A cobertura para veículos 4x4 e uso off-road (fora de estrada) possui particularidades importantes. A maioria das seguradoras tradicionais cobre o uso de veículos 4x4 em estradas de terra ou vias não pavimentadas, desde que sejam vias públicas reconhecidas. No entanto, danos ocorridos em trilhas pesadas, competições, travessia de rios ou locais de difícil acesso sem via pública podem ser excluídos. Quanto ao guincho, a assistência 24h geralmente atende em locais acessíveis por guinchos convencionais. Se o veículo estiver atolado em local de difícil acesso (lama profunda, areia, mata), a seguradora pode cobrar um valor adicional pelo resgate especial ou até recusar o atendimento se o risco não estiver previsto. É fundamental contratar coberturas específicas para uso off-road se esse for o perfil de uso do segurado.`,
    metadata: { source: "susep", category: "ramos", topic: "offroad_4x4" }
  },
  {
    content: `O carro reserva é um benefício opcional oferecido em seguros de automóvel. Garante ao segurado um veículo substituto durante o período de reparo do carro segurado ou enquanto aguarda indenização por perda total. O prazo varia de 7 a 30 dias dependendo do plano contratado. Algumas coberturas incluem extensão para sinistros em oficinas referenciadas.`,
    metadata: { source: "susep", category: "servicos", topic: "carro_reserva" }
  },

  // === TERMOS TÉCNICOS ADICIONAIS ===
  {
    content: `O endosso é a alteração das condições do seguro durante sua vigência. Pode ser para inclusão ou exclusão de coberturas, alteração de dados cadastrais, substituição do bem segurado, ou correção de informações. O endosso pode gerar cobrança adicional de prêmio ou restituição parcial, dependendo da alteração realizada.`,
    metadata: { source: "susep", category: "conceitos_basicos", topic: "endosso" }
  },
  {
    content: `A sub-rogação é o direito da seguradora de reaver de terceiros os valores pagos em indenização ao segurado, quando o sinistro foi causado por culpa desse terceiro. Após pagar a indenização, a seguradora pode acionar judicialmente o causador do dano para recuperar o valor pago. O segurado deve colaborar fornecendo informações necessárias.`,
    metadata: { source: "susep", category: "conceitos_basicos", topic: "subrogacao" }
  },
  {
    content: `O rateio é aplicado quando o valor declarado do bem segurado é inferior ao seu valor real no momento do sinistro (infrasseguro). Neste caso, a indenização é proporcional à relação entre o valor segurado e o valor real. Por exemplo: se o bem vale R$ 100.000 mas foi segurado por R$ 50.000, a indenização será de apenas 50% do prejuízo.`,
    metadata: { source: "susep", category: "conceitos_basicos", topic: "rateio" }
  },
  {
    content: `O cosseguro ocorre quando duas ou mais seguradoras dividem o risco de uma mesma apólice. Cada seguradora assume uma porcentagem do risco e recebe a correspondente parte do prêmio. É comum em grandes riscos empresariais e industriais. Uma seguradora atua como líder, sendo responsável pela emissão da apólice e regulação de sinistros.`,
    metadata: { source: "susep", category: "conceitos_basicos", topic: "cosseguro" }
  },
  {
    content: `O resseguro é o seguro das seguradoras. Permite que a seguradora transfira parte dos riscos assumidos para uma resseguradora, mantendo sua capacidade de assumir novos negócios. O IRB (Instituto de Resseguros do Brasil) foi por muito tempo monopolista, mas desde 2007 o mercado brasileiro está aberto a resseguradoras internacionais.`,
    metadata: { source: "susep", category: "conceitos_basicos", topic: "resseguro" }
  }
];

async function populateKnowledgeBase() {
  console.log("🚀 Iniciando população da base de conhecimento RAG...\n");
  console.log(`📚 Total de ${knowledgeBase.length} itens para inserir\n`);

  const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      contents: knowledgeBase
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Erro ao chamar generate-embeddings:", response.status, errorText);
    Deno.exit(1);
  }

  const result = await response.json();
  
  console.log("\n✅ Resultado da população:");
  console.log(`   📊 Processados: ${result.processed}`);
  console.log(`   ✅ Inseridos com sucesso: ${result.inserted}`);
  console.log(`   ❌ Falhas: ${result.processed - result.inserted}`);
  
  if (result.results) {
    const failures = result.results.filter((r: any) => !r.success);
    if (failures.length > 0) {
      console.log("\n⚠️ Itens com falha:");
      failures.forEach((f: any, i: number) => {
        console.log(`   ${i + 1}. ${f.error}`);
      });
    }
  }

  console.log("\n🎉 Base de conhecimento populada com sucesso!");
  console.log("   Agora o Amorim AI pode responder perguntas sobre seguros usando RAG.");
}

// Executar
populateKnowledgeBase().catch(console.error);
