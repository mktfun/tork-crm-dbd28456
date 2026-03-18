import { useState } from "react";
import { Copy, Check, Car, Home, Heart, Building2, Plane, Stethoscope, Link2, MessageCircle, RefreshCw, PlusCircle, Smartphone, Send, SendHorizontal, Loader2, FileEdit, KeyRound, AlertTriangle } from "lucide-react";
import { Button } from "@/modules/jjseguros/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/jjseguros/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/modules/jjseguros/integrations/supabase/client";

type DealMode = "novo" | "renovacao" | "endosso";

const insuranceLinks = [
  {
    type: "auto",
    name: "Seguro Auto",
    icon: Car,
    color: "from-blue-500 to-blue-600",
    emoji: "🚗",
    hasDealType: true,
    messages: {
      novo: "Olá! 👋\n\nPara fazer a cotação do seu *Seguro Auto Novo* é bem simples!\n\nÉ só acessar o link abaixo e preencher os dados do veículo:\n\n🚗 {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
      renovacao: "Olá! 👋\n\nPara fazer a *Renovação do seu Seguro Auto* conosco é bem simples!\n\nÉ só acessar o link abaixo e preencher os dados:\n\n🔄 {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
    },
  },
  {
    type: "uber",
    name: "Seguro Uber/Similares",
    icon: Smartphone,
    color: "from-violet-500 to-violet-600",
    emoji: "📱",
    hasDealType: true,
    messages: {
      novo: "Olá! 👋\n\nPara fazer a cotação do seu *Seguro Uber/App Novo* é bem simples!\n\nÉ só acessar o link abaixo e preencher os dados do veículo:\n\n📱 {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
      renovacao: "Olá! 👋\n\nPara fazer a *Renovação do seu Seguro Uber/App* conosco é bem simples!\n\nÉ só acessar o link abaixo e preencher os dados:\n\n🔄 {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
    },
  },
  {
    type: "residencial",
    name: "Seguro Residencial",
    icon: Home,
    color: "from-emerald-500 to-emerald-600",
    emoji: "🏠",
    hasDealType: false,
    message: "Olá! 👋\n\nPara fazer a cotação do seu *Seguro Residencial* é bem simples!\n\nÉ só acessar o link abaixo e preencher os dados do imóvel:\n\n🏠 {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
  },
  {
    type: "vida",
    name: "Seguro de Vida",
    icon: Heart,
    color: "from-rose-500 to-rose-600",
    emoji: "❤️",
    hasDealType: false,
    message: "Olá! 👋\n\nPara fazer a cotação do seu *Seguro de Vida* é bem simples!\n\nÉ só acessar o link abaixo e preencher algumas informações:\n\n❤️ {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
  },
  {
    type: "empresarial",
    name: "Seguro Empresarial",
    icon: Building2,
    color: "from-amber-500 to-amber-600",
    emoji: "🏢",
    hasDealType: false,
    message: "Olá! 👋\n\nPara fazer a cotação do *Seguro Empresarial* é bem simples!\n\nÉ só acessar o link abaixo e preencher os dados da empresa:\n\n🏢 {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
  },
  {
    type: "viagem",
    name: "Seguro Viagem",
    icon: Plane,
    color: "from-sky-500 to-sky-600",
    emoji: "✈️",
    hasDealType: false,
    message: "Olá! 👋\n\nPara fazer a cotação do seu *Seguro Viagem* é bem simples!\n\nÉ só acessar o link abaixo e preencher os dados da viagem:\n\n✈️ {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
  },
  {
    type: "saude",
    name: "Plano de Saúde",
    icon: Stethoscope,
    color: "from-teal-500 to-teal-600",
    emoji: "🏥",
    hasDealType: false,
    message: "Olá! 👋\n\nPara fazer a cotação do seu *Plano de Saúde* é bem simples!\n\nÉ só acessar o link abaixo e preencher algumas informações:\n\n🏥 {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
  },
  {
    type: "smartphone",
    name: "Seguro Smartphone",
    icon: Smartphone,
    color: "from-purple-500 to-purple-600",
    emoji: "📱",
    hasDealType: false,
    message: "Olá! 👋\n\nPara fazer a cotação do seu *Seguro Smartphone* é bem simples!\n\nÉ só acessar o link abaixo e preencher os dados:\n\n📱 {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
  },
  {
    type: "fianca",
    name: "Fiança Residencial",
    icon: KeyRound,
    color: "from-stone-500 to-stone-600",
    emoji: "🔑",
    hasDealType: false,
    message: "Olá! 👋\n\nPara fazer a cotação do seu *Seguro Fiança Residencial* é bem simples!\n\nDispense fiador e garanta seu aluguel com segurança.\n\n🔑 {link}\n\nLeva menos de 2 minutos! Qualquer dúvida estou à disposição.",
  },
  {
    type: "sinistro",
    name: "Aviso de Sinistro",
    icon: AlertTriangle,
    color: "from-amber-500 to-orange-600",
    emoji: "⚠️",
    hasDealType: false,
    message: "Olá! Sinto muito pelo ocorrido. ⚠️\n\nPara agilizarmos a abertura do seu *Aviso de Sinistro*, por favor preencha os dados necessários no formulário abaixo:\n\n⚠️ {link}\n\nAssim que recebermos, entraremos em contato para os próximos passos.",
  },
];

const qarVariableMap: Record<string, string> = {
  auto: 'cf_qar_auto',
  uber: 'cf_qar_uber',
  residencial: 'cf_qar_residencial',
  vida: 'cf_qar_vida',
  empresarial: 'cf_qar_empresarial',
  viagem: 'cf_qar_viagem',
  saude: 'cf_qar_saude',
  smartphone: 'cf_qar_smartphone',
  fianca: 'cf_qar_residencial',
  sinistro: 'cf_qar_auto'
};

const insuranceNames: Record<string, string> = {
  auto: 'Seguro Auto',
  uber: 'Seguro Uber/Similares',
  residencial: 'Seguro Residencial',
  vida: 'Seguro de Vida',
  empresarial: 'Seguro Empresarial',
  viagem: 'Seguro Viagem',
  saude: 'Plano de Saúde',
  smartphone: 'Seguro Smartphone',
  fianca: 'Fiança Residencial',
  sinistro: 'Aviso de Sinistro'
};

const Links = () => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [dealModes, setDealModes] = useState<Record<string, DealMode>>({
    auto: "novo",
    uber: "novo",
  });
  const [sendingType, setSendingType] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const baseUrl = window.location.origin;

  const generateTestPayload = (type: string) => {
    const timestamp = new Date().toLocaleString('pt-BR');
    
    const generateAutoQAR = (isUber: boolean) => `NOVO LEAD: ${isUber ? 'SEGURO UBER/SIMILARES' : 'SEGURO AUTO'}

Nome: David
Chamar: https://wa.me/5511996242812

RESUMO DO RISCO:

Nome: David
Tipo: Pessoa Fisica
CPF: 123.456.789-00
Estado Civil: Casado(a)
Profissao: Consultor de Seguros

DADOS DO VEICULO:

Modelo: Honda Civic EX 2026
Placa: ABC-1D23
Ano/Modelo: 2026/2026
Zero KM: Nao
Financiado: Sim
Tipo de Uso: ${isUber ? 'Uso Comercial (Uber/99)' : 'Uso Pessoal'}

ENDERECO:

CEP: 01310-100
Endereco: Av. Paulista, 1000
Bairro: Bela Vista
Cidade: Sao Paulo
Estado: SP
Tipo Residencia: Casa
Garagem: Portao Automatico

ROTINA DE USO:

Usa p/ Trabalho: Sim
Estacionamento Trabalho: Garagem Fechada
Usa p/ Faculdade: Nao

PERFIL DE RISCO:

Reside com pessoa 18-25 anos: Sim
Essa pessoa conduz o veiculo: Sim
Idade do condutor jovem: 22 anos
Sexo: Masculino

CONTATO:

Email: silveira.odavid@gmail.com
Telefone: (11) 99624-2812

Evento de Teste: ${timestamp}`;

    const residencialQAR = `NOVO LEAD: SEGURO RESIDENCIAL

Nome: David
Chamar: https://wa.me/5511996242812

RESUMO DO RISCO:

Nome: David
Tipo: Pessoa Fisica
CPF: 123.456.789-00
Estado Civil: Casado(a)
Profissao: Consultor de Seguros

DADOS DO IMOVEL:

Tipo: Casa
Ocupacao: Proprietario
Alarme: Sim
Condominio Fechado: Nao

ENDERECO:

CEP: 01310-100
Endereco: Av. Paulista, 1000
Bairro: Bela Vista
Cidade: Sao Paulo
Estado: SP

VALORES E COBERTURAS:

Valor do Imovel: R$ 500.000,00
Valor dos Conteudos: R$ 100.000,00
Cobertura Roubo/Furto: Sim
Danos Eletricos: Sim
Responsabilidade Civil: Nao
Equipamentos Eletronicos: Sim

CONTATO:

Email: silveira.odavid@gmail.com
Telefone: (11) 99624-2812

Evento de Teste: ${timestamp}`;

    const vidaQAR = `NOVO LEAD: SEGURO DE VIDA

Nome: David
Chamar: https://wa.me/5511996242812

RESUMO DO RISCO:

Nome: David
CPF: 123.456.789-00
Data de Nascimento: 15/05/1985
Profissao: Consultor de Seguros

PERFIL DE SAUDE:

Fumante: Nao
Esportes Radicais: Nao
Doenca Cronica: Nao

DADOS FINANCEIROS:

Faixa de Renda: R$ 5.000 - R$ 10.000
Cobertura Desejada: R$ 500.000,00

BENEFICIARIOS:

Nome: Maria Silva
Parentesco: Conjuge

CONTATO:

Email: silveira.odavid@gmail.com
Telefone: (11) 99624-2812

Evento de Teste: ${timestamp}`;

    const empresarialQAR = `NOVO LEAD: SEGURO EMPRESARIAL

Nome: David
Chamar: https://wa.me/5511996242812

DADOS DA EMPRESA:

Razao Social: JJ Seguros LTDA
CNPJ: 12.345.678/0001-90
Ramo: Servicos
Funcionarios: 11 a 50
Faturamento Anual: R$ 1.500.000,00

ENDERECO:

CEP: 01310-100
Endereco: Av. Paulista, 1000
Bairro: Bela Vista
Cidade: Sao Paulo
Estado: SP
Loja Fisica: Sim

COBERTURAS:

Valor do Estabelecimento: R$ 800.000,00
Responsabilidade Civil: Sim
Cobertura Funcionarios: Sim
Cobertura Equipamentos: Sim

CONTATO:

Email: silveira.odavid@gmail.com
Telefone: (11) 99624-2812

Evento de Teste: ${timestamp}`;

    const viagemQAR = `NOVO LEAD: SEGURO VIAGEM

Nome: David
Chamar: https://wa.me/5511996242812

DADOS DA VIAGEM:

Tipo: Internacional
Destino: Estados Unidos
Motivo: Turismo
Data Ida: 01/02/2026
Data Volta: 15/02/2026
Duracao: 14 dias

VIAJANTES:

Quantidade: 2
Viajante 1: David (Titular)
Viajante 2: Maria Silva (Conjuge)

COBERTURAS:

Cancelamento: Sim
Extravio Bagagem: Sim

CONTATO:

Email: silveira.odavid@gmail.com
Telefone: (11) 99624-2812

Evento de Teste: ${timestamp}`;

    const saudeQAR = `NOVO LEAD: PLANO DE SAUDE

Nome: David
Chamar: https://wa.me/5511996242812

DADOS DO TITULAR:

Nome: David
CPF: 123.456.789-00
Data de Nascimento: 15/05/1985

DEPENDENTES:

Quantidade: 1
Dependente 1: Maria Silva (Conjuge, 35 anos)

PREFERENCIAS:

Tipo de Plano: Familiar
Cobertura: Completo (Ambulatorial + Hospitalar)
Odontologica: Sim
Hospital Preferido: Hospital Albert Einstein

CONTATO:

Email: silveira.odavid@gmail.com
Telefone: (11) 99624-2812

Evento de Teste: ${timestamp}`;

    // Seleciona o QAR correto baseado no tipo
    let testQAR = '';
    let extraCustomFields: Record<string, string> = {};

    switch (type) {
      case 'auto':
        testQAR = generateAutoQAR(false);
        extraCustomFields = {
          cf_placa: 'ABC-1D23',
          cf_modelo_veiculo: 'Honda Civic EX 2026',
          cf_ano_modelo: '2026/2026',
          cf_zero_km: 'Não',
          cf_financiado: 'Sim',
          cf_tipo_uso: 'Uso Pessoal',
          cf_tipo_residencia: 'Casa',
          cf_garagem: 'Portão Automático'
        };
        break;
      case 'uber':
        testQAR = generateAutoQAR(true);
        extraCustomFields = {
          cf_placa: 'ABC-1D23',
          cf_modelo_veiculo: 'Honda Civic EX 2026',
          cf_ano_modelo: '2026/2026',
          cf_zero_km: 'Não',
          cf_financiado: 'Sim',
          cf_tipo_uso: 'Uso Comercial (Uber/99)',
          cf_tipo_residencia: 'Casa',
          cf_garagem: 'Portão Automático'
        };
        break;
      case 'residencial':
        testQAR = residencialQAR;
        extraCustomFields = {
          cf_tipo_imovel: 'Casa',
          cf_tipo_ocupacao: 'Proprietário',
          cf_possui_alarme: 'Sim',
          cf_condominio_fechado: 'Não',
          cf_valor_imovel: 'R$ 500.000,00',
          cf_valor_conteudos: 'R$ 100.000,00'
        };
        break;
      case 'vida':
        testQAR = vidaQAR;
        extraCustomFields = {
          cf_data_nascimento: '15/05/1985',
          cf_fumante: 'Não',
          cf_pratica_esportes: 'Não',
          cf_doenca_cronica: 'Não',
          cf_faixa_renda: 'R$ 5.000 - R$ 10.000',
          cf_valor_cobertura: 'R$ 500.000,00',
          cf_beneficiario: 'Maria Silva (Cônjuge)'
        };
        break;
      case 'empresarial':
        testQAR = empresarialQAR;
        extraCustomFields = {
          cf_razao_social: 'JJ Seguros LTDA',
          cf_cnpj: '12.345.678/0001-90',
          cf_ramo_atividade: 'Serviços',
          cf_num_funcionarios: '11 a 50',
          cf_faturamento_anual: 'R$ 1.500.000,00',
          cf_valor_estabelecimento: 'R$ 800.000,00'
        };
        break;
      case 'viagem':
        testQAR = viagemQAR;
        extraCustomFields = {
          cf_tipo_destino: 'Internacional',
          cf_destino: 'Estados Unidos',
          cf_motivo_viagem: 'Turismo',
          cf_data_ida: '01/02/2026',
          cf_data_volta: '15/02/2026',
          cf_qtd_viajantes: '2',
          cf_cobertura_cancelamento: 'Sim',
          cf_cobertura_bagagem: 'Sim'
        };
        break;
      case 'saude':
        testQAR = saudeQAR;
        extraCustomFields = {
          cf_data_nascimento: '15/05/1985',
          cf_possui_dependentes: 'Sim',
          cf_qtd_dependentes: '1',
          cf_tipo_plano: 'Familiar',
          cf_tipo_cobertura: 'Completo',
          cf_cobertura_odonto: 'Sim',
          cf_hospital_preferido: 'Hospital Albert Einstein'
        };
        break;
      case 'smartphone':
        testQAR = `NOVO LEAD: SEGURO SMARTPHONE

Nome: David
Chamar: https://wa.me/5511996242812

DADOS DO SEGURADO:

Nome: David
CPF: 123.456.789-00
Data Nascimento: 15/05/1985
Estado Civil: Casado(a)
Profissao: Consultor de Seguros

ENDERECO DO IMOVEL:

CEP: 01310-100
Endereco: Av. Paulista, 1000
Bairro: Bela Vista
Cidade: Sao Paulo
Estado: SP
Imovel de Veraneio: Nao

DADOS DO SMARTPHONE:

Valor da NF: R$ 5.500,00

CONTATO:

Email: silveira.odavid@gmail.com
Telefone: (11) 99624-2812

Evento de Teste: ${timestamp}`;
        extraCustomFields = {
          cf_valor_smartphone: 'R$ 5.500,00'
        };
        break;
      case 'sinistro':
        testQAR = `NOVO LEAD: AVISO DE SINISTRO

Nome do Condutor: João Carlos da Silva
Chamar: https://wa.me/5511996242812

RESUMO DO SINISTRO:

Veiculo: Honda Civic EX
Placa: ABC-1D23
Ano/Modelo: 2024/2025

DADOS DO CONDUTOR:

CPF: 123.456.789-00
Data Nascimento: 15/05/1985
Estado Civil: Casado(a)
Email: joao@email.com
CNH: 12345678900
Validade CNH: 10/2030

OCORRENCIA:

Data: 10/10/2026
Hora: 14:30
Local: Av. Paulista, 1000 - Bela Vista, Sao Paulo - SP
Relato: Colisao traseira enquanto aguardava no semaforo. O veiculo de tras nao conseguiu frear a tempo.

DADOS DA OFICINA:

Razao Social: Oficina do Joao LTDA
CNPJ: 12.345.678/0001-90
Telefone: (11) 98765-4321
Endereco: Rua das Oficinas, 100

TERCEIRO:

Houve terceiro envolvido: Sim
Nome Terceiro: Maria Pereira
CPF Terceiro: 987.654.321-00
Email Terceiro: maria@email.com

Evento de Teste: ${timestamp}`;
        extraCustomFields = {
          cf_tipo_solicitacao_seguro: 'Aviso de Sinistro',
          cf_cpf: '12345678900'
        };
        break;
      default:
        testQAR = `NOVO LEAD: ${insuranceNames[type]?.toUpperCase()}\n\nEvento de Teste: ${timestamp}`;
    }

    return {
      contactData: {
        name: "David",
        email: "silveira.odavid@gmail.com",
        personal_phone: "11996242812",
        city: "São Paulo",
        state: "SP"
      },
      customFields: {
        cf_tipo_solicitacao_seguro: insuranceNames[type],
        [qarVariableMap[type]]: testQAR,
        cf_qar_respondido: testQAR,
        cf_tipo_pessoa: type === 'empresarial' ? 'Pessoa Jurídica' : 'Pessoa Física',
        cf_cpf: type === 'empresarial' ? '' : '123.456.789-00',
        cf_cnpj: type === 'empresarial' ? '12.345.678/0001-90' : '',
        cf_estado_civil: 'Casado(a)',
        cf_profissao: 'Consultor de Seguros',
        cf_cep: '01310-100',
        cf_endereco: 'Av. Paulista, 1000, Bela Vista, São Paulo, SP',
        ...extraCustomFields
      },
      job_title: "Consultor de Seguros",
      mobile_phone: "11996242812"
    };
  };

  const sendTestToRD = async (type: string, name: string) => {
    setSendingType(type);
    try {
      const payload = generateTestPayload(type);
      
      const { data, error } = await supabase.functions.invoke('rd-station', {
        body: payload
      });

      if (error) {
        toast.error(`Erro ao enviar ${name}`);
        console.error('Erro:', error);
        return false;
      } else {
        toast.success(`${name} enviado com sucesso!`);
        console.log('Resposta:', data);
        return true;
      }
    } catch (err) {
      toast.error(`Erro ao enviar ${name}`);
      console.error('Erro crítico:', err);
      return false;
    } finally {
      setSendingType(null);
    }
  };

  const sendAllToRD = async () => {
    setSendingAll(true);
    
    const types = ['auto', 'uber', 'residencial', 'vida', 'empresarial', 'viagem', 'saude', 'smartphone'];
    
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const link = insuranceLinks.find(l => l.type === type);
      
      if (link) {
        toast.info(`Enviando ${link.name}...`);
        setSendingType(type);
        
        try {
          const payload = generateTestPayload(type);
          const { error } = await supabase.functions.invoke('rd-station', {
            body: payload
          });

          if (error) {
            toast.error(`Erro ao enviar ${link.name}`);
            console.error('Erro:', error);
          } else {
            toast.success(`${link.name} enviado!`);
          }
        } catch (err) {
          toast.error(`Erro ao enviar ${link.name}`);
          console.error('Erro crítico:', err);
        }
        
        setSendingType(null);
        
        // Aguarda 1 segundo entre envios (exceto no último)
        if (i < types.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    toast.success('Todos os testes enviados!');
    setSendingAll(false);
  };

  const getUrlForType = (type: string, hasDealType: boolean) => {
    if (hasDealType) {
      const mode = dealModes[type] || "novo";
      return `${baseUrl}/cotacao?type=${type}&deal=${mode}`;
    }
    return `${baseUrl}/cotacao?type=${type}`;
  };

  const getMessageForType = (link: typeof insuranceLinks[0]) => {
    if (link.hasDealType && link.messages) {
      const mode = dealModes[link.type] || "novo";
      return link.messages[mode];
    }
    return link.message || "";
  };

  const copyLink = async (type: string, name: string, hasDealType: boolean) => {
    const url = getUrlForType(type, hasDealType);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedType(type);
      toast.success(`Link de ${name} copiado!`);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      toast.error("Erro ao copiar link");
    }
  };

  const copyMessage = async (type: string, name: string, link: typeof insuranceLinks[0]) => {
    const url = getUrlForType(type, link.hasDealType);
    const messageTemplate = getMessageForType(link);
    const message = messageTemplate.replace("{link}", url);
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(type);
      toast.success(`Mensagem de ${name} copiada!`);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (err) {
      toast.error("Erro ao copiar mensagem");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <Link2 className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Painel de Cotações</h1>
          </div>
          <p className="text-primary-foreground/80">
            Gerencie links, mensagens e testes de integração
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="links" className="w-full">
          <TabsList className="w-full sm:w-auto mb-6 grid grid-cols-3 sm:flex">
            <TabsTrigger value="links" className="gap-2">
              <Link2 className="w-4 h-4" />
              Links
            </TabsTrigger>
            <TabsTrigger value="mensagens" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="testes" className="gap-2">
              <SendHorizontal className="w-4 h-4" />
              Testes RD
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Links */}
          <TabsContent value="links">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insuranceLinks.map((link) => {
                const Icon = link.icon;
                const isCopied = copiedType === link.type;
                const fullUrl = getUrlForType(link.type, link.hasDealType);
                const currentMode = dealModes[link.type] || "novo";

                return (
                  <div
                    key={link.type}
                    className="bg-card border border-border rounded-xl p-5 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${link.color} text-white shrink-0`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-1">{link.name}</h3>
                        
                        {link.hasDealType && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            <button
                              onClick={() => setDealModes(prev => ({ ...prev, [link.type]: "novo" }))}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                                currentMode === "novo"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              <PlusCircle className="w-3 h-3" />
                              Novo
                            </button>
                            <button
                              onClick={() => setDealModes(prev => ({ ...prev, [link.type]: "renovacao" }))}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                                currentMode === "renovacao"
                                  ? "bg-secondary text-secondary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              <RefreshCw className="w-3 h-3" />
                              Renovação
                            </button>
                            <button
                              onClick={() => setDealModes(prev => ({ ...prev, [link.type]: "endosso" as DealMode }))}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                                currentMode === "endosso"
                                  ? "bg-amber-500 text-white"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              <FileEdit className="w-3 h-3" />
                              Endosso
                            </button>
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground truncate mb-3" title={fullUrl}>
                          {fullUrl}
                        </p>
                        <Button
                          onClick={() => copyLink(link.type, link.name, link.hasDealType)}
                          variant={isCopied ? "default" : "outline"}
                          size="sm"
                          className="w-full gap-1.5"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Link2 className="w-4 h-4" />
                              Copiar Link
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Tab 2: Mensagens Prontas */}
          <TabsContent value="mensagens">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {insuranceLinks.map((link) => {
                const Icon = link.icon;
                const isMessageCopied = copiedMessage === link.type;
                const currentMode = dealModes[link.type] || "novo";

                return (
                  <div
                    key={link.type}
                    className="bg-card border border-border rounded-xl p-5 hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${link.color} text-white shrink-0`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground mb-2">{link.name}</h3>
                        
                        {link.hasDealType && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            <button
                              onClick={() => setDealModes(prev => ({ ...prev, [link.type]: "novo" }))}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                                currentMode === "novo"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              <PlusCircle className="w-3 h-3" />
                              Novo
                            </button>
                            <button
                              onClick={() => setDealModes(prev => ({ ...prev, [link.type]: "renovacao" }))}
                              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                                currentMode === "renovacao"
                                  ? "bg-secondary text-secondary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              <RefreshCw className="w-3 h-3" />
                              Renovação
                            </button>
                          </div>
                        )}

                        <Button
                          onClick={() => copyMessage(link.type, link.name, link)}
                          variant={isMessageCopied ? "default" : "secondary"}
                          size="sm"
                          className="w-full gap-1.5"
                        >
                          {isMessageCopied ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-4 h-4" />
                              Copiar Mensagem WhatsApp
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mensagem geral */}
            <div className="bg-muted/50 rounded-xl p-6 border border-border">
              <h3 className="font-semibold text-foreground mb-4">Mensagem Completa (Todos os Links)</h3>
              <div className="bg-background rounded-lg p-4 text-sm text-muted-foreground font-mono whitespace-pre-line border">
{`Olá! 👋

Seguem os links para fazer sua cotação online:

🚗 Seguro Auto: ${baseUrl}/cotacao?type=auto
📱 Seguro Uber/App: ${baseUrl}/cotacao?type=uber
🏠 Seguro Residencial: ${baseUrl}/cotacao?type=residencial
❤️ Seguro de Vida: ${baseUrl}/cotacao?type=vida
🏢 Seguro Empresarial: ${baseUrl}/cotacao?type=empresarial
✈️ Seguro Viagem: ${baseUrl}/cotacao?type=viagem
🏥 Plano de Saúde: ${baseUrl}/cotacao?type=saude
🔑 Fiança Residencial: ${baseUrl}/cotacao?type=fianca

É rápido e fácil! Qualquer dúvida estou à disposição.`}
              </div>
              <Button
                onClick={async () => {
                  const message = `Olá! 👋\n\nSeguem os links para fazer sua cotação online:\n\n🚗 Seguro Auto: ${baseUrl}/cotacao?type=auto\n📱 Seguro Uber/App: ${baseUrl}/cotacao?type=uber\n🏠 Seguro Residencial: ${baseUrl}/cotacao?type=residencial\n❤️ Seguro de Vida: ${baseUrl}/cotacao?type=vida\n🏢 Seguro Empresarial: ${baseUrl}/cotacao?type=empresarial\n✈️ Seguro Viagem: ${baseUrl}/cotacao?type=viagem\n🏥 Plano de Saúde: ${baseUrl}/cotacao?type=saude\n🔑 Fiança Residencial: ${baseUrl}/cotacao?type=fianca\n\nÉ rápido e fácil! Qualquer dúvida estou à disposição.`;
                  await navigator.clipboard.writeText(message);
                  toast.success("Mensagem copiada!");
                }}
                className="mt-4 gap-2"
              >
                <Copy className="w-4 h-4" />
                Copiar Mensagem Completa
              </Button>
            </div>
          </TabsContent>

          {/* Tab 3: Testes RD Station */}
          <TabsContent value="testes">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <SendHorizontal className="w-5 h-5 text-orange-500" />
                Teste de Integração RD Station
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Envie eventos de teste para todos os tipos de seguro de uma vez.
              </p>
              <Button
                onClick={sendAllToRD}
                className="gap-2 bg-orange-500 hover:bg-orange-600 text-white"
                disabled={sendingAll}
              >
                {sendingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando todos...
                  </>
                ) : (
                  <>
                    <SendHorizontal className="w-4 h-4" />
                    Enviar Todos para RD Station
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insuranceLinks.map((link) => {
                const Icon = link.icon;
                const isSending = sendingType === link.type;

                return (
                  <div
                    key={link.type}
                    className="bg-card border border-border rounded-xl p-5"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${link.color} text-white shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-foreground">{link.name}</h3>
                    </div>
                    <Button
                      onClick={() => sendTestToRD(link.type, link.name)}
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 border-orange-400 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                      disabled={isSending || sendingAll}
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Enviar Teste
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Links;
