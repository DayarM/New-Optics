/**
 * Configuração geral do CRM.
 * Tudo que muda de uma loja para outra (ou de uma fase para outra) fica aqui,
 * nunca espalhado pelo código.
 */
export const APP_CONFIG = {
  versao: '1.0.0',

  loja: {
    nome: 'MM Óptica',
    slogan: 'Sua visão em boas mãos',
    endereco: 'Rua Pedro Pereira, 686',
    whatsapp: '5585988618282',
    instagram: '@mm_optica',
    // Logos extraídos da campanha (brancos, para fundo roxo).
    logo: './assets/logo.png',                 // completo, com slogan (tela de entrada)
    logoCompacto: './assets/logo-compacto.png', // cabeçalho
    // Foto da campanha usada como ilustração na tela de entrada.
    // Para trocar a cada campanha, substitua o arquivo ou aponte para outro.
    fotoCampanha: './assets/campanha-crianca.jpg',
  },

  api: {
    // Cole aqui a URL "/exec" da implantação do Apps Script.
    // Vazio = MODO DEMONSTRAÇÃO: os dados ficam só neste navegador (bom para treinar).
    url: '',
    tempoLimiteMs: 20000,
  },

  fusoHorario: 'America/Fortaleza',

  lista: {
    // Quantos contatos por dia, no máximo, aparecem em "Quem contatar hoje".
    limiteDiario: 20,
  },

  busca: {
    maxResultados: 60,
  },

  /**
   * FEATURE FLAGS — liguem as fases sem refatorar.
   * Ao trocar para true, o menu e as rotas da fase passam a ser carregados
   * (veja main.js → carregarModulosDeFase). Os módulos ainda não existem na Fase 1.
   */
  features: {
    leads: false,       // Fase 2
    vendas: false,      // Fase 3
    indicadores: false, // Fase 3
  },

  /**
   * Menu principal. Na Fase 1 são 3 itens.
   * Itens com `flag` só aparecem quando a feature correspondente está ligada.
   */
  menu: [
    { id: 'hoje', rotulo: 'Hoje', rota: '#/hoje', icone: 'sol' },
    { id: 'clientes', rotulo: 'Clientes', rota: '#/clientes', icone: 'pessoas' },
    { id: 'cadastrar', rotulo: 'Cadastrar', rota: '#/clientes/novo', icone: 'mais' },
    // PONTO DE EXTENSÃO (Fase 2/3): itens já previstos, desligados pelas flags.
    { id: 'leads', rotulo: 'Leads', rota: '#/leads', icone: 'funil', flag: 'leads' },
    { id: 'vendas', rotulo: 'Vendas', rota: '#/vendas', icone: 'sacola', flag: 'vendas' },
    { id: 'indicadores', rotulo: 'Resultados', rota: '#/indicadores', icone: 'grafico', flag: 'indicadores' },
  ],
};

export function featureLigada(nome) {
  return Boolean(APP_CONFIG.features[nome]);
}
