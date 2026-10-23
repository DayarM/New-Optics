/**
 * Erros da aplicação. Toda falha que chega à tela vira um AppError com um
 * `codigo` conhecido, traduzido para linguagem simples em config/textos.js.
 */
import { TEXTOS } from '../config/textos.js';

export class AppError extends Error {
  /**
   * @param {string} codigo   rede | tempo | sessao | login_invalido | bloqueado |
   *                          conflito | nao_encontrado | ocupado | validacao | servidor
   * @param {string} [mensagem] mensagem já amigável vinda do servidor (ex.: validação)
   * @param {unknown} [causa]
   */
  constructor(codigo, mensagem, causa) {
    super(mensagem || codigo);
    this.name = 'AppError';
    this.codigo = codigo;
    this.mensagemAmigavel = mensagem || '';
    this.causa = causa;
  }
}

/**
 * Mensagem para o operador.
 * @param {unknown} erro
 * @param {'salvar'|'carregar'|'excluir'|'entrar'} [acao]
 */
export function mensagemParaOperador(erro, acao) {
  const e = TEXTOS.erros;
  if (erro instanceof AppError) {
    if (erro.codigo === 'validacao' && erro.mensagemAmigavel) return erro.mensagemAmigavel;
    if (e[erro.codigo]) return e[erro.codigo];
  }
  return e[acao] || e.generico;
}

/** Registra o detalhe técnico no console (para quem for dar suporte). */
export function registrarErro(erro, contexto = '') {
  // PONTO DE EXTENSÃO: enviar para um log remoto (ex.: aba "Erros" na planilha).
  console.error(`[CRM] ${contexto}`, erro);
}
