/**
 * Lista de cidades brasileiras organizadas por estado
 * Otimizada para qualificação de leads - inclui principais cidades
 */

export interface City {
  value: string;
  label: string;
}

export interface StateWithCities {
  value: string;
  label: string;
  cities: City[];
}

// Principais cidades por estado (cobertura comercial típica)
export const brazilianStatesWithCities: StateWithCities[] = [
  {
    value: 'AC',
    label: 'Acre',
    cities: [
      { value: 'rio_branco', label: 'Rio Branco' },
      { value: 'cruzeiro_do_sul', label: 'Cruzeiro do Sul' },
      { value: 'sena_madureira', label: 'Sena Madureira' },
      { value: 'tarauaca', label: 'Tarauacá' },
      { value: 'feijo', label: 'Feijó' },
    ],
  },
  {
    value: 'AL',
    label: 'Alagoas',
    cities: [
      { value: 'maceio', label: 'Maceió' },
      { value: 'arapiraca', label: 'Arapiraca' },
      { value: 'rio_largo', label: 'Rio Largo' },
      { value: 'palmeira_dos_indios', label: 'Palmeira dos Índios' },
      { value: 'penedo', label: 'Penedo' },
    ],
  },
  {
    value: 'AP',
    label: 'Amapá',
    cities: [
      { value: 'macapa', label: 'Macapá' },
      { value: 'santana', label: 'Santana' },
      { value: 'laranjal_do_jari', label: 'Laranjal do Jari' },
      { value: 'oiapoque', label: 'Oiapoque' },
      { value: 'mazagao', label: 'Mazagão' },
    ],
  },
  {
    value: 'AM',
    label: 'Amazonas',
    cities: [
      { value: 'manaus', label: 'Manaus' },
      { value: 'parintins', label: 'Parintins' },
      { value: 'itacoatiara', label: 'Itacoatiara' },
      { value: 'manacapuru', label: 'Manacapuru' },
      { value: 'coari', label: 'Coari' },
      { value: 'tefé', label: 'Tefé' },
    ],
  },
  {
    value: 'BA',
    label: 'Bahia',
    cities: [
      { value: 'salvador', label: 'Salvador' },
      { value: 'feira_de_santana', label: 'Feira de Santana' },
      { value: 'vitoria_da_conquista', label: 'Vitória da Conquista' },
      { value: 'camacari', label: 'Camaçari' },
      { value: 'itabuna', label: 'Itabuna' },
      { value: 'juazeiro', label: 'Juazeiro' },
      { value: 'lauro_de_freitas', label: 'Lauro de Freitas' },
      { value: 'ilheus', label: 'Ilhéus' },
      { value: 'jequie', label: 'Jequié' },
      { value: 'teixeira_de_freitas', label: 'Teixeira de Freitas' },
    ],
  },
  {
    value: 'CE',
    label: 'Ceará',
    cities: [
      { value: 'fortaleza', label: 'Fortaleza' },
      { value: 'caucaia', label: 'Caucaia' },
      { value: 'juazeiro_do_norte', label: 'Juazeiro do Norte' },
      { value: 'maracanau', label: 'Maracanaú' },
      { value: 'sobral', label: 'Sobral' },
      { value: 'crato', label: 'Crato' },
      { value: 'itapipoca', label: 'Itapipoca' },
      { value: 'maranguape', label: 'Maranguape' },
    ],
  },
  {
    value: 'DF',
    label: 'Distrito Federal',
    cities: [
      { value: 'brasilia', label: 'Brasília' },
      { value: 'ceilandia', label: 'Ceilândia' },
      { value: 'taguatinga', label: 'Taguatinga' },
      { value: 'samambaia', label: 'Samambaia' },
      { value: 'planaltina', label: 'Planaltina' },
      { value: 'aguas_claras', label: 'Águas Claras' },
    ],
  },
  {
    value: 'ES',
    label: 'Espírito Santo',
    cities: [
      { value: 'vitoria', label: 'Vitória' },
      { value: 'serra', label: 'Serra' },
      { value: 'vila_velha', label: 'Vila Velha' },
      { value: 'cariacica', label: 'Cariacica' },
      { value: 'cachoeiro_de_itapemirim', label: 'Cachoeiro de Itapemirim' },
      { value: 'linhares', label: 'Linhares' },
      { value: 'colatina', label: 'Colatina' },
      { value: 'guarapari', label: 'Guarapari' },
    ],
  },
  {
    value: 'GO',
    label: 'Goiás',
    cities: [
      { value: 'goiania', label: 'Goiânia' },
      { value: 'aparecida_de_goiania', label: 'Aparecida de Goiânia' },
      { value: 'anapolis', label: 'Anápolis' },
      { value: 'rio_verde', label: 'Rio Verde' },
      { value: 'luziania', label: 'Luziânia' },
      { value: 'aguas_lindas_de_goias', label: 'Águas Lindas de Goiás' },
      { value: 'valparaiso_de_goias', label: 'Valparaíso de Goiás' },
      { value: 'trindade', label: 'Trindade' },
      { value: 'formosa', label: 'Formosa' },
      { value: 'itumbiara', label: 'Itumbiara' },
    ],
  },
  {
    value: 'MA',
    label: 'Maranhão',
    cities: [
      { value: 'sao_luis', label: 'São Luís' },
      { value: 'imperatriz', label: 'Imperatriz' },
      { value: 'sao_jose_de_ribamar', label: 'São José de Ribamar' },
      { value: 'timon', label: 'Timon' },
      { value: 'caxias', label: 'Caxias' },
      { value: 'codó', label: 'Codó' },
      { value: 'paco_do_lumiar', label: 'Paço do Lumiar' },
      { value: 'acailandia', label: 'Açailândia' },
    ],
  },
  {
    value: 'MT',
    label: 'Mato Grosso',
    cities: [
      { value: 'cuiaba', label: 'Cuiabá' },
      { value: 'varzea_grande', label: 'Várzea Grande' },
      { value: 'rondonopolis', label: 'Rondonópolis' },
      { value: 'sinop', label: 'Sinop' },
      { value: 'tangara_da_serra', label: 'Tangará da Serra' },
      { value: 'caceres', label: 'Cáceres' },
      { value: 'sorriso', label: 'Sorriso' },
      { value: 'primavera_do_leste', label: 'Primavera do Leste' },
    ],
  },
  {
    value: 'MS',
    label: 'Mato Grosso do Sul',
    cities: [
      { value: 'campo_grande', label: 'Campo Grande' },
      { value: 'dourados', label: 'Dourados' },
      { value: 'tres_lagoas', label: 'Três Lagoas' },
      { value: 'corumba', label: 'Corumbá' },
      { value: 'ponta_pora', label: 'Ponta Porã' },
      { value: 'naviraí', label: 'Naviraí' },
      { value: 'nova_andradina', label: 'Nova Andradina' },
    ],
  },
  {
    value: 'MG',
    label: 'Minas Gerais',
    cities: [
      { value: 'belo_horizonte', label: 'Belo Horizonte' },
      { value: 'uberlandia', label: 'Uberlândia' },
      { value: 'contagem', label: 'Contagem' },
      { value: 'juiz_de_fora', label: 'Juiz de Fora' },
      { value: 'betim', label: 'Betim' },
      { value: 'montes_claros', label: 'Montes Claros' },
      { value: 'ribeirao_das_neves', label: 'Ribeirão das Neves' },
      { value: 'uberaba', label: 'Uberaba' },
      { value: 'governador_valadares', label: 'Governador Valadares' },
      { value: 'ipatinga', label: 'Ipatinga' },
      { value: 'sete_lagoas', label: 'Sete Lagoas' },
      { value: 'divinopolis', label: 'Divinópolis' },
      { value: 'santa_luzia', label: 'Santa Luzia' },
      { value: 'pocos_de_caldas', label: 'Poços de Caldas' },
      { value: 'patos_de_minas', label: 'Patos de Minas' },
    ],
  },
  {
    value: 'PA',
    label: 'Pará',
    cities: [
      { value: 'belem', label: 'Belém' },
      { value: 'ananindeua', label: 'Ananindeua' },
      { value: 'santarem', label: 'Santarém' },
      { value: 'maraba', label: 'Marabá' },
      { value: 'castanhal', label: 'Castanhal' },
      { value: 'parauapebas', label: 'Parauapebas' },
      { value: 'abaetetuba', label: 'Abaetetuba' },
      { value: 'cameta', label: 'Cametá' },
    ],
  },
  {
    value: 'PB',
    label: 'Paraíba',
    cities: [
      { value: 'joao_pessoa', label: 'João Pessoa' },
      { value: 'campina_grande', label: 'Campina Grande' },
      { value: 'santa_rita', label: 'Santa Rita' },
      { value: 'patos', label: 'Patos' },
      { value: 'bayeux', label: 'Bayeux' },
      { value: 'sousa', label: 'Sousa' },
      { value: 'cabedelo', label: 'Cabedelo' },
    ],
  },
  {
    value: 'PR',
    label: 'Paraná',
    cities: [
      { value: 'curitiba', label: 'Curitiba' },
      { value: 'londrina', label: 'Londrina' },
      { value: 'maringa', label: 'Maringá' },
      { value: 'ponta_grossa', label: 'Ponta Grossa' },
      { value: 'cascavel', label: 'Cascavel' },
      { value: 'sao_jose_dos_pinhais', label: 'São José dos Pinhais' },
      { value: 'foz_do_iguacu', label: 'Foz do Iguaçu' },
      { value: 'colombo', label: 'Colombo' },
      { value: 'guarapuava', label: 'Guarapuava' },
      { value: 'paranagua', label: 'Paranaguá' },
      { value: 'araucaria', label: 'Araucária' },
      { value: 'toledo', label: 'Toledo' },
    ],
  },
  {
    value: 'PE',
    label: 'Pernambuco',
    cities: [
      { value: 'recife', label: 'Recife' },
      { value: 'jaboatao_dos_guararapes', label: 'Jaboatão dos Guararapes' },
      { value: 'olinda', label: 'Olinda' },
      { value: 'caruaru', label: 'Caruaru' },
      { value: 'petrolina', label: 'Petrolina' },
      { value: 'paulista', label: 'Paulista' },
      { value: 'cabo_de_santo_agostinho', label: 'Cabo de Santo Agostinho' },
      { value: 'camaragibe', label: 'Camaragibe' },
      { value: 'garanhuns', label: 'Garanhuns' },
      { value: 'vitoria_de_santo_antao', label: 'Vitória de Santo Antão' },
    ],
  },
  {
    value: 'PI',
    label: 'Piauí',
    cities: [
      { value: 'teresina', label: 'Teresina' },
      { value: 'parnaiba', label: 'Parnaíba' },
      { value: 'picos', label: 'Picos' },
      { value: 'piripiri', label: 'Piripiri' },
      { value: 'floriano', label: 'Floriano' },
      { value: 'campo_maior', label: 'Campo Maior' },
    ],
  },
  {
    value: 'RJ',
    label: 'Rio de Janeiro',
    cities: [
      { value: 'rio_de_janeiro', label: 'Rio de Janeiro' },
      { value: 'sao_goncalo', label: 'São Gonçalo' },
      { value: 'duque_de_caxias', label: 'Duque de Caxias' },
      { value: 'nova_iguacu', label: 'Nova Iguaçu' },
      { value: 'niteroi', label: 'Niterói' },
      { value: 'campos_dos_goytacazes', label: 'Campos dos Goytacazes' },
      { value: 'belford_roxo', label: 'Belford Roxo' },
      { value: 'sao_joao_de_meriti', label: 'São João de Meriti' },
      { value: 'petropolis', label: 'Petrópolis' },
      { value: 'volta_redonda', label: 'Volta Redonda' },
      { value: 'macae', label: 'Macaé' },
      { value: 'mage', label: 'Magé' },
      { value: 'itaborai', label: 'Itaboraí' },
      { value: 'cabo_frio', label: 'Cabo Frio' },
      { value: 'angra_dos_reis', label: 'Angra dos Reis' },
    ],
  },
  {
    value: 'RN',
    label: 'Rio Grande do Norte',
    cities: [
      { value: 'natal', label: 'Natal' },
      { value: 'mossoro', label: 'Mossoró' },
      { value: 'parnamirim', label: 'Parnamirim' },
      { value: 'sao_goncalo_do_amarante', label: 'São Gonçalo do Amarante' },
      { value: 'ceara_mirim', label: 'Ceará-Mirim' },
      { value: 'macaiba', label: 'Macaíba' },
      { value: 'caico', label: 'Caicó' },
    ],
  },
  {
    value: 'RS',
    label: 'Rio Grande do Sul',
    cities: [
      { value: 'porto_alegre', label: 'Porto Alegre' },
      { value: 'caxias_do_sul', label: 'Caxias do Sul' },
      { value: 'canoas', label: 'Canoas' },
      { value: 'pelotas', label: 'Pelotas' },
      { value: 'santa_maria', label: 'Santa Maria' },
      { value: 'gravatai', label: 'Gravataí' },
      { value: 'viamao', label: 'Viamão' },
      { value: 'novo_hamburgo', label: 'Novo Hamburgo' },
      { value: 'sao_leopoldo', label: 'São Leopoldo' },
      { value: 'rio_grande', label: 'Rio Grande' },
      { value: 'alvorada', label: 'Alvorada' },
      { value: 'passo_fundo', label: 'Passo Fundo' },
      { value: 'sapucaia_do_sul', label: 'Sapucaia do Sul' },
      { value: 'uruguaiana', label: 'Uruguaiana' },
      { value: 'santa_cruz_do_sul', label: 'Santa Cruz do Sul' },
    ],
  },
  {
    value: 'RO',
    label: 'Rondônia',
    cities: [
      { value: 'porto_velho', label: 'Porto Velho' },
      { value: 'ji_parana', label: 'Ji-Paraná' },
      { value: 'ariquemes', label: 'Ariquemes' },
      { value: 'vilhena', label: 'Vilhena' },
      { value: 'cacoal', label: 'Cacoal' },
      { value: 'rolim_de_moura', label: 'Rolim de Moura' },
    ],
  },
  {
    value: 'RR',
    label: 'Roraima',
    cities: [
      { value: 'boa_vista', label: 'Boa Vista' },
      { value: 'rorainopolis', label: 'Rorainópolis' },
      { value: 'caracarai', label: 'Caracaraí' },
      { value: 'alto_alegre', label: 'Alto Alegre' },
      { value: 'mucajai', label: 'Mucajaí' },
    ],
  },
  {
    value: 'SC',
    label: 'Santa Catarina',
    cities: [
      { value: 'joinville', label: 'Joinville' },
      { value: 'florianopolis', label: 'Florianópolis' },
      { value: 'blumenau', label: 'Blumenau' },
      { value: 'sao_jose', label: 'São José' },
      { value: 'chapeco', label: 'Chapecó' },
      { value: 'criciuma', label: 'Criciúma' },
      { value: 'itajai', label: 'Itajaí' },
      { value: 'jaragua_do_sul', label: 'Jaraguá do Sul' },
      { value: 'lages', label: 'Lages' },
      { value: 'palhoca', label: 'Palhoça' },
      { value: 'balneario_camboriu', label: 'Balneário Camboriú' },
      { value: 'brusque', label: 'Brusque' },
    ],
  },
  {
    value: 'SP',
    label: 'São Paulo',
    cities: [
      { value: 'sao_paulo', label: 'São Paulo' },
      { value: 'guarulhos', label: 'Guarulhos' },
      { value: 'campinas', label: 'Campinas' },
      { value: 'sao_bernardo_do_campo', label: 'São Bernardo do Campo' },
      { value: 'santo_andre', label: 'Santo André' },
      { value: 'osasco', label: 'Osasco' },
      { value: 'ribeirao_preto', label: 'Ribeirão Preto' },
      { value: 'sorocaba', label: 'Sorocaba' },
      { value: 'maua', label: 'Mauá' },
      { value: 'sao_jose_dos_campos', label: 'São José dos Campos' },
      { value: 'santos', label: 'Santos' },
      { value: 'mogi_das_cruzes', label: 'Mogi das Cruzes' },
      { value: 'diadema', label: 'Diadema' },
      { value: 'jundiai', label: 'Jundiaí' },
      { value: 'piracicaba', label: 'Piracicaba' },
      { value: 'carapicuiba', label: 'Carapicuíba' },
      { value: 'bauru', label: 'Bauru' },
      { value: 'itaquaquecetuba', label: 'Itaquaquecetuba' },
      { value: 'sao_jose_do_rio_preto', label: 'São José do Rio Preto' },
      { value: 'praia_grande', label: 'Praia Grande' },
      { value: 'taubate', label: 'Taubaté' },
      { value: 'limeira', label: 'Limeira' },
      { value: 'suzano', label: 'Suzano' },
      { value: 'taboao_da_serra', label: 'Taboão da Serra' },
      { value: 'franca', label: 'Franca' },
      { value: 'barueri', label: 'Barueri' },
      { value: 'sao_vicente', label: 'São Vicente' },
      { value: 'marilia', label: 'Marília' },
      { value: 'presidente_prudente', label: 'Presidente Prudente' },
      { value: 'cotia', label: 'Cotia' },
    ],
  },
  {
    value: 'SE',
    label: 'Sergipe',
    cities: [
      { value: 'aracaju', label: 'Aracaju' },
      { value: 'nossa_senhora_do_socorro', label: 'Nossa Senhora do Socorro' },
      { value: 'lagarto', label: 'Lagarto' },
      { value: 'itabaiana', label: 'Itabaiana' },
      { value: 'sao_cristovao', label: 'São Cristóvão' },
      { value: 'estancia', label: 'Estância' },
    ],
  },
  {
    value: 'TO',
    label: 'Tocantins',
    cities: [
      { value: 'palmas', label: 'Palmas' },
      { value: 'araguaina', label: 'Araguaína' },
      { value: 'gurupi', label: 'Gurupi' },
      { value: 'porto_nacional', label: 'Porto Nacional' },
      { value: 'paraiso_do_tocantins', label: 'Paraíso do Tocantins' },
      { value: 'colinas_do_tocantins', label: 'Colinas do Tocantins' },
    ],
  },
];

// Função para obter cidades de um estado
export function getCitiesByState(stateCode: string): City[] {
  const state = brazilianStatesWithCities.find(s => s.value === stateCode);
  return state?.cities ?? [];
}

// Função para obter label da cidade
export function getCityLabel(stateCode: string, cityValue: string): string {
  const cities = getCitiesByState(stateCode);
  const city = cities.find(c => c.value === cityValue);
  return city?.label ?? cityValue;
}

// Lista simples de estados (para manter compatibilidade)
export const brazilianStatesSimple = brazilianStatesWithCities.map(s => ({
  value: s.value,
  label: s.label,
}));
