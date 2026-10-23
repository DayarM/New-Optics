/**
 * REGRAS DE RECONTATO, RESULTADOS E MENSAGENS
 * --------------------------------------------------------------
 * Para mudar prazos, textos ou ligar/desligar uma regra, edite só este
 * arquivo. O motor (js/services/recontatoService.js) lê estes objetos e
 * não tem nenhum prazo fixo no código.
 *
 * Tipos de regra suportados pelo motor:
 *  - 'agendado'   : data de próximo contato marcada no botão "Contatei".
 *  - 'aposData'   : X dias depois de uma data-base (ver `base`).
 *  - 'aniversario': no dia do aniversário do cliente.
 *
 * Bases de data disponíveis (para tipo 'aposData'):
 *  - 'ultimaCompra'            : data da última compra.
 *  - 'ultimaReceitaOuCompra'   : a mais recente entre última receita e última compra.
 * PONTO DE EXTENSÃO: novas bases são criadas em BASES_DE_DATA, no recontatoService.
 */

export const REGRAS_RECONTATO = {
  /** LGPD: cliente sem consentimento nunca entra na lista. */
  exigeConsentimento: true,

  regras: [
    {
      chave: 'retorno_agendado',
      tipo: 'agendado',
      ativa: true,
      prioridade: 1,
      motivoPadrao: 'Retorno combinado',
      mensagem: 'retorno',
    },
    {
      chave: 'pos_venda',
      tipo: 'aposData',
      base: 'ultimaCompra',
      dias: 7,
      // Depois de 30 dias de atraso a regra "vence" e sai da lista,
      // para clientes antigos importados não lotarem a tela.
      validadeDias: 30,
      ativa: true,
      prioridade: 2,
      motivo: 'Pós-venda: saber se está adaptado aos óculos',
      mensagem: 'posVenda',
    },
    {
      chave: 'aniversario',
      tipo: 'aniversario',
      ativa: true,
      prioridade: 3,
      // Aparece mesmo se houver um retorno agendado para outro dia.
      ignoraAgendamento: true,
      motivo: 'Aniversário hoje',
      mensagem: 'aniversario',
    },
    {
      chave: 'revisao_anual',
      tipo: 'aposData',
      base: 'ultimaReceitaOuCompra',
      dias: 365,
      validadeDias: 180,
      ativa: true,
      prioridade: 4,
      motivo: 'Faz 1 ano: hora de revisar o grau',
      mensagem: 'revisao',
    },
  ],

  /**
   * Opções do botão "Contatei".
   * reagendarEmDias: null = não reagenda (as regras automáticas seguem valendo).
   * statusLead: status que o LEAD recebe com esse resultado (null = mantém;
   *             um lead "novo" sempre passa para "em contato").
   */
  resultados: [
    { chave: 'interessado',   rotulo: 'Tem interesse',        reagendarEmDias: 3,    motivoRetorno: 'Retornar: tem interesse', statusLead: null },
    { chave: 'vai_passar',    rotulo: 'Vai passar na loja',   reagendarEmDias: null, motivoRetorno: null,                       statusLead: 'agendado' },
    { chave: 'nao_respondeu', rotulo: 'Não respondeu',        reagendarEmDias: 30,   motivoRetorno: 'Nova tentativa: não respondeu antes', statusLead: null },
    { chave: 'sem_interesse', rotulo: 'Sem interesse agora',  reagendarEmDias: 180,  motivoRetorno: 'Retomar contato',          statusLead: 'perdido' },
    { chave: 'resolvido',     rotulo: 'Resolvido',            reagendarEmDias: null, motivoRetorno: null,                       statusLead: null },
  ],

  /** Regras para LEADS na lista "Quem contatar hoje" (Fase 2). */
  leads: {
    ativa: true,
    statusAtivos: ['novo', 'em_contato', 'agendado'], // convertido/perdido nunca entram
    novo: { prioridade: 2, motivo: 'Lead novo: fazer o primeiro contato', mensagem: 'leadNovo', validadeDias: 30 },
    retorno: { prioridade: 1, motivoPadrao: 'Retorno combinado com o lead', mensagem: 'retorno' },
  },
};

/**
 * Textos de WhatsApp. Variáveis disponíveis: {primeiroNome}, {loja}.
 * PONTO DE EXTENSÃO: novas variáveis são preenchidas em mensagemService.js.
 */
export const MENSAGENS_WHATSAPP = {
  posVenda:
    'Olá, {primeiroNome}! Aqui é da {loja}. Passando para saber se você está se adaptando bem aos seus óculos novos. Se precisar de algum ajuste, é só passar aqui. 😊',
  revisao:
    'Olá, {primeiroNome}! Aqui é da {loja}. Já faz cerca de um ano desde a sua última visita. Que tal agendar uma revisão do grau? Estamos à disposição.',
  aniversario:
    'Feliz aniversário, {primeiroNome}! 🎉 Toda a equipe da {loja} deseja um dia lindo para você.',
  retorno:
    'Olá, {primeiroNome}! Aqui é da {loja}, tudo bem? Estou retomando nossa conversa.',
  leadNovo:
    'Olá, {primeiroNome}! Aqui é da {loja}. Vi o seu interesse e fico à disposição para ajudar a escolher os óculos ideais. Posso te mostrar algumas opções?',
  padrao:
    'Olá, {primeiroNome}! Aqui é da {loja}, tudo bem?',
};
