/**
 * CONFIGURAÇÃO GERAL DO APP
 * --------------------------------------------------------------
 * Tudo que muda sem precisar "programar" fica aqui.
 * Nenhum segredo (senha, chave) pode ficar neste arquivo: ele é público
 * quando o site está no GitHub Pages.
 */

export const APP_CONFIG = {
  /**
   * URL do Web App do Google Apps Script (termina em /exec).
   * Deixe vazio ('') para rodar em MODO DEMONSTRAÇÃO, com dados
   * salvos só neste aparelho — útil para testar antes de publicar.
   */
  apiUrl: '',

  /** Tempo máximo de espera por resposta do servidor (ms). */
  timeoutMs: 20000,

  /** Dados da loja (usados nas mensagens de WhatsApp e no rodapé). */
  loja: {
    nome: 'MM Ótica',
    slogan: 'Sua visão em boas mãos',
    whatsapp: '(85) 98861-8282',
    instagram: '@mm_optica',
    endereco: 'Rua Pedro Pereira, 686',
  },

  /** DDI usado para montar o link wa.me quando o número vem sem ele. */
  ddiPadrao: '55',

  /**
   * FEATURE FLAGS — ligam/desligam módulos sem mexer no código.
   * `leads` também precisa de CONFIG.FASES.leads = true no Code.gs.
   */
  features: {
    leads: true,              // Fase 2 – cadastro e funil de leads
    indicadores: true,        // Fase 3 – painel com indicadores
  },
};

/** Modo demonstração é ligado automaticamente quando não há apiUrl. */
export const MODO_DEMO = !APP_CONFIG.apiUrl;
