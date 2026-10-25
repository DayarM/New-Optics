/**
 * Adaptador Google Sheets (Apps Script Web App).
 *
 * Detalhe importante: o POST vai com Content-Type "text/plain".
 * Assim o navegador não faz a requisição de pré-verificação (CORS preflight),
 * que o Apps Script não sabe responder. O corpo continua sendo JSON.
 */
import { AppError } from '../../core/erros.js?v=38e7358a80';
import { lerSessao } from '../../core/sessao.js?v=38e7358a80';

export function criarSheetsAdapter({ apiUrl, timeoutMs }) {
  async function chamar(acao, dados = {}) {
    if (!navigator.onLine) throw new AppError('SEM_CONEXAO');

    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), timeoutMs);
    let resposta;
    try {
      resposta = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ acao, token: lerSessao()?.token || '', dados }),
        redirect: 'follow',
        signal: controle.signal,
      });
    } catch (e) {
      throw new AppError(e.name === 'AbortError' ? 'TEMPO_ESGOTADO' : 'SEM_CONEXAO');
    } finally {
      clearTimeout(timer);
    }

    let corpo;
    try {
      corpo = await resposta.json();
    } catch {
      throw new AppError('DESCONHECIDO');
    }
    // Contrato do servidor: { ok: true, dados } | { ok: false, erro: { codigo, campos? } }
    if (!corpo.ok) throw new AppError(corpo.erro?.codigo || 'DESCONHECIDO', { campos: corpo.erro?.campos });
    return corpo.dados;
  }

  return {
    login: (usuario, senha) => chamar('login', { usuario, senha }),
    carregar: () => chamar('carregar'),
    salvarCliente: (cliente) => chamar('salvarCliente', cliente),
    excluirCliente: (id) => chamar('excluirCliente', { id }),
    registrarContato: (contato) => chamar('registrarContato', contato),
    salvarCompra: (compra) => chamar('salvarCompra', compra),
    salvarReceita: (receita) => chamar('salvarReceita', receita),
    excluirRegistro: (tipo, id) => chamar('excluirRegistro', { tipo, id }),
    salvarLead: (lead) => chamar('salvarLead', lead),
    excluirLead: (id) => chamar('excluirLead', { id }),
    converterLead: (id) => chamar('converterLead', { id }),
    // PONTO DE EXTENSÃO – FASE 3: carregarIndicadores (se a agregação for para o servidor)
  };
}
