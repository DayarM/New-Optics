/**
 * dataService — ÚNICA porta de entrada para ler e gravar dados.
 * --------------------------------------------------------------
 * As telas e os serviços nunca sabem se os dados estão no Google Sheets,
 * no MySQL ou no navegador. Para trocar de backend:
 *   1. crie js/data/adapters/<novo>Adapter.js com os mesmos métodos;
 *   2. troque a escolha em `escolherAdapter()` abaixo.
 * Nada mais muda.
 *
 * Também mantém um cache em memória: a lista do dia é calculada no
 * aparelho, sem precisar ir ao servidor a cada clique.
 */
import { APP_CONFIG, MODO_DEMO } from '../config/app.config.js';
import { AppError } from '../core/erros.js';
import { criarSheetsAdapter } from './adapters/sheetsAdapter.js';
import { criarDemoAdapter } from './adapters/demoAdapter.js';

function escolherAdapter() {
  if (MODO_DEMO) return criarDemoAdapter();
  return criarSheetsAdapter(APP_CONFIG);
  // PONTO DE EXTENSÃO: return criarMysqlAdapter(APP_CONFIG); // HostGator (PHP + MySQL)
}

const adapter = escolherAdapter();
let cache = null; // { clientes, contatos, compras, receitas }
const ouvintes = new Set();

/** Garante que erros fora do padrão virem AppError com o código informado. */
async function executar(promessa, codigoPadrao) {
  try {
    return await promessa;
  } catch (e) {
    if (e instanceof AppError) throw e;
    console.error(e); // detalhe técnico só no console, nunca na tela
    throw new AppError(codigoPadrao);
  }
}

function avisar() { ouvintes.forEach((fn) => fn(cache)); }
function substituir(lista, item) {
  const i = lista.findIndex((x) => x.id === item.id);
  if (i >= 0) lista[i] = item; else lista.push(item);
}

export const dataService = {
  /** Chamado quando o cache muda (ex.: depois de salvar). */
  aoMudar(fn) { ouvintes.add(fn); return () => ouvintes.delete(fn); },

  async login(usuario, senha) {
    return executar(adapter.login(usuario, senha), 'DESCONHECIDO');
  },

  /** Carrega tudo uma vez; `forcar` busca de novo no servidor. */
  async obterTudo({ forcar = false } = {}) {
    if (!cache || forcar) {
      cache = await executar(adapter.carregar(), 'ERRO_CARREGAR');
      for (const k of ['clientes', 'contatos', 'compras', 'receitas', 'leads']) cache[k] = cache[k] || [];
      avisar();
    }
    return cache;
  },

  limparCache() { cache = null; },

  async salvarCliente(cliente) {
    const salvo = await executar(adapter.salvarCliente(cliente), 'ERRO_SALVAR');
    if (cache) { substituir(cache.clientes, salvo); avisar(); }
    return salvo;
  },

  async excluirCliente(id) {
    await executar(adapter.excluirCliente(id), 'ERRO_EXCLUIR');
    if (cache) {
      cache.clientes = cache.clientes.filter((x) => x.id !== id);
      for (const t of ['contatos', 'compras', 'receitas']) cache[t] = cache[t].filter((x) => x.cliente_id !== id);
      avisar();
    }
  },

  /** contato com cliente_id OU lead_id. Retorna { contato, cliente? , lead? } */
  async registrarContato(contato) {
    const r = await executar(adapter.registrarContato(contato), 'ERRO_SALVAR');
    if (cache) {
      cache.contatos.push(r.contato);
      if (r.cliente) substituir(cache.clientes, r.cliente);
      if (r.lead) substituir(cache.leads, r.lead);
      avisar();
    }
    return r;
  },

  /* ---------------- LEADS (Fase 2) ---------------- */
  async salvarLead(lead) {
    const salvo = await executar(adapter.salvarLead(lead), 'ERRO_SALVAR');
    if (cache) { substituir(cache.leads, salvo); avisar(); }
    return salvo;
  },

  async excluirLead(id) {
    await executar(adapter.excluirLead(id), 'ERRO_EXCLUIR');
    if (cache) {
      cache.leads = cache.leads.filter((x) => x.id !== id);
      cache.contatos = cache.contatos.filter((x) => x.lead_id !== id);
      avisar();
    }
  },

  /** Cria o cliente a partir do lead. Retorna { lead, cliente }. */
  async converterLead(id) {
    const r = await executar(adapter.converterLead(id), 'ERRO_SALVAR');
    if (cache) { substituir(cache.leads, r.lead); substituir(cache.clientes, r.cliente); avisar(); }
    return r;
  },

  async salvarCompra(compra) {
    const r = await executar(adapter.salvarCompra(compra), 'ERRO_SALVAR');
    if (cache) { cache.compras.push(r.compra); substituir(cache.clientes, r.cliente); avisar(); }
    return r;
  },

  async salvarReceita(receita) {
    const r = await executar(adapter.salvarReceita(receita), 'ERRO_SALVAR');
    if (cache) { cache.receitas.push(r.receita); avisar(); }
    return r;
  },

  /** tipo: 'compras' | 'receitas' */
  async excluirRegistro(tipo, id) {
    const r = await executar(adapter.excluirRegistro(tipo, id), 'ERRO_EXCLUIR');
    if (cache) {
      cache[tipo] = cache[tipo].filter((x) => x.id !== id);
      if (r?.cliente) substituir(cache.clientes, r.cliente);
      avisar();
    }
    return r;
  },

  // PONTO DE EXTENSÃO – indicadores no servidor: obterIndicadores(periodo)
};
