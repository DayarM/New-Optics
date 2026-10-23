/**
 * dataService — ÚNICA porta de entrada para ler e gravar dados.
 * As telas nunca falam com o backend diretamente. Para trocar Google Sheets por
 * PHP + MySQL (HostGator), por exemplo, basta criar outro adaptador com os
 * mesmos métodos e escolhê-lo em `escolherAdaptador()`.
 *
 * Contrato de cada adaptador:
 *   entrar({login, senha})        → { token, nome, login }
 *   sair(token)                   → void
 *   carregarTudo(token)           → { clientes: Cliente[], contatos: Contato[] }
 *   salvarCliente(token, cliente) → Cliente (com id, versao, datas de auditoria)
 *   excluirCliente(token, id)     → { contatosRemovidos: number }
 *   registrarContato(token, c)    → { contato: Contato, cliente?: Cliente }
 */
import { APP_CONFIG } from '../config/app.config.js';
import { AppError } from '../core/erros.js';
import { criarAdaptadorAppsScript } from './adapters/appsScript.adapter.js';
import { criarAdaptadorDemo } from './adapters/demo.adapter.js';

const CHAVE_SESSAO = 'mmcrm.sessao';
const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000; // o servidor é quem decide de fato

function escolherAdaptador() {
  // PONTO DE EXTENSÃO: outro backend (ex.: criarAdaptadorPhpMysql(APP_CONFIG.api)).
  return APP_CONFIG.api.url ? criarAdaptadorAppsScript(APP_CONFIG.api) : criarAdaptadorDemo();
}

const adaptador = escolherAdaptador();

/* ---------------- sessão ---------------- */

function lerSessao() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE_SESSAO) || 'null');
    if (!s || !s.token || Date.now() > s.expiraEm) return null;
    return s;
  } catch {
    return null;
  }
}

function gravarSessao(s) {
  try { localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); } catch { /* navegador sem armazenamento */ }
}

function apagarSessao() {
  try { localStorage.removeItem(CHAVE_SESSAO); } catch { /* ignora */ }
}

/** Executa a chamada com o token; se a sessão expirou, avisa o app. */
async function comSessao(fn) {
  const s = lerSessao();
  if (!s) {
    window.dispatchEvent(new CustomEvent('crm:sessao-expirada'));
    throw new AppError('sessao');
  }
  try {
    return await fn(s.token);
  } catch (erro) {
    if (erro instanceof AppError && erro.codigo === 'sessao') {
      apagarSessao();
      window.dispatchEvent(new CustomEvent('crm:sessao-expirada'));
    }
    throw erro;
  }
}

/* ---------------- API pública ---------------- */

export const dataService = {
  modoDemonstracao: !APP_CONFIG.api.url,

  sessaoAtual() {
    const s = lerSessao();
    return s ? { nome: s.nome, login: s.login } : null;
  },

  async entrar(login, senha) {
    const r = await adaptador.entrar({ login, senha });
    gravarSessao({ ...r, expiraEm: Date.now() + DURACAO_SESSAO_MS });
    return { nome: r.nome, login: r.login };
  },

  async sair() {
    const s = lerSessao();
    apagarSessao();
    if (s) {
      try { await adaptador.sair(s.token); } catch { /* sair localmente já basta */ }
    }
  },

  carregarTudo() {
    return comSessao((t) => adaptador.carregarTudo(t));
  },

  salvarCliente(cliente) {
    return comSessao((t) => adaptador.salvarCliente(t, cliente));
  },

  excluirCliente(id) {
    return comSessao((t) => adaptador.excluirCliente(t, id));
  },

  registrarContato(contato) {
    return comSessao((t) => adaptador.registrarContato(t, contato));
  },

  /*
   * PONTO DE EXTENSÃO — Fase 2 (Leads):
   *   listarLeads(), salvarLead(lead), converterLeadEmCliente(leadId)
   * PONTO DE EXTENSÃO — Fase 3 (Vendas e indicadores):
   *   registrarVenda(venda), listarVendas(filtro), carregarIndicadores(periodo)
   * Cada método novo segue o mesmo padrão: comSessao((t) => adaptador.metodo(t, ...)).
   */
};
