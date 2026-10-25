/**
 * Tratamento de erros centralizado.
 * Toda falha vira um AppError com um `codigo`. A interface nunca mostra
 * mensagens técnicas: ela traduz o código via MENSAGENS_ERRO.
 */
import { MENSAGENS_ERRO } from '../config/textos.config.js?v=9ece4c76cc';

export class AppError extends Error {
  /**
   * @param {string} codigo   chave de MENSAGENS_ERRO
   * @param {object} [extra]  ex.: { campos: { nome: 'Informe o nome' } }
   */
  constructor(codigo, extra = {}) {
    super(codigo);
    this.name = 'AppError';
    this.codigo = codigo;
    this.extra = extra;
  }
}

/**
 * Converte qualquer erro em texto para o operador.
 * @param {unknown} erro
 * @param {string} [padrao] código usado quando o erro não é reconhecido
 */
export function mensagemAmigavel(erro, padrao = 'DESCONHECIDO') {
  const codigo = erro instanceof AppError ? erro.codigo : padrao;
  return MENSAGENS_ERRO[codigo] || MENSAGENS_ERRO[padrao] || MENSAGENS_ERRO.DESCONHECIDO;
}
