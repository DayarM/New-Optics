/**
 * Adaptador Google Sheets + Apps Script.
 * Envia POST com Content-Type text/plain: assim o navegador não faz a
 * requisição "preflight" de CORS, que o Apps Script não responde.
 */
import { AppError } from '../../core/erros.js';

export function criarAdaptadorAppsScript({ url, tempoLimiteMs = 20000 }) {
  async function chamar(acao, dados, token) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new AppError('rede');
    }

    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), tempoLimiteMs);
    let resposta;
    try {
      resposta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ acao, token, dados }),
        redirect: 'follow',
        signal: controle.signal,
      });
    } catch (erro) {
      throw new AppError(erro?.name === 'AbortError' ? 'tempo' : 'rede', '', erro);
    } finally {
      clearTimeout(timer);
    }

    if (!resposta.ok) throw new AppError('servidor', '', `HTTP ${resposta.status}`);

    let corpo;
    try {
      corpo = await resposta.json();
    } catch (erro) {
      // Normalmente: URL errada ou implantação sem acesso "Qualquer pessoa".
      throw new AppError('servidor', '', erro);
    }

    if (!corpo?.ok) {
      throw new AppError(corpo?.erro?.codigo || 'servidor', corpo?.erro?.mensagem || '');
    }
    return corpo.dados;
  }

  return {
    entrar: (credenciais) => chamar('login', credenciais),
    sair: (token) => chamar('logout', {}, token),
    carregarTudo: (token) => chamar('carregar', {}, token),
    salvarCliente: (token, cliente) => chamar('salvarCliente', cliente, token),
    excluirCliente: (token, id) => chamar('excluirCliente', { id }, token),
    registrarContato: (token, contato) => chamar('registrarContato', contato, token),
  };
}
