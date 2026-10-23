/**
 * MOTOR DE RECONTATO — somente funções PURAS.
 * Não acessa tela, rede nem relógio: recebe tudo por parâmetro
 * (inclusive `hoje`), por isso é testável com `node --test`.
 *
 * As regras vêm de js/config/regras.config.js.
 */
import { somarDias, diferencaDias, maisRecente, ehAniversario, ehDataISO } from '../core/datas.js';

/**
 * Datas-base usadas pelas regras do tipo 'aposData'.
 * PONTO DE EXTENSÃO: para criar uma regra nova baseada em outra data
 * (ex.: 'validadeLenteContato'), adicione uma função aqui e use o nome no config.
 */
export const BASES_DE_DATA = {
  ultimaCompra: (cliente, hist) =>
    maisRecente([cliente.ultima_compra, ...hist.compras.map((c) => c.data)]),
  ultimaReceitaOuCompra: (cliente, hist) =>
    maisRecente([
      BASES_DE_DATA.ultimaCompra(cliente, hist),
      ...hist.receitas.map((r) => r.data),
    ]),
};

const HIST_VAZIO = { contatos: [], compras: [], receitas: [] };

/**
 * Avalia UM cliente e diz se ele deve ser contatado hoje.
 * @returns {null | { regra, motivo, mensagem, prioridade, dataAlvo, diasAtraso }}
 */
export function avaliarCliente(cliente, historico, hoje, config) {
  const hist = { ...HIST_VAZIO, ...historico };
  if (config.exigeConsentimento && !ehVerdadeiro(cliente.consentimento)) return null;

  const ultimoContato = maisRecente(hist.contatos.map((c) => c.data));
  const agendado = ehDataISO(cliente.proximo_contato) ? cliente.proximo_contato : null;
  const agendadoNoFuturo = agendado && agendado > hoje;

  const candidatos = [];
  for (const regra of config.regras) {
    if (!regra.ativa) continue;
    // Um retorno marcado para o futuro "segura" as regras automáticas,
    // exceto as que pedem para ignorar (ex.: aniversário).
    if (agendadoNoFuturo && !regra.ignoraAgendamento) continue;

    const r = AVALIADORES[regra.tipo]?.(regra, { cliente, hist, hoje, agendado, ultimoContato });
    if (r) candidatos.push({ ...r, regra: regra.chave, prioridade: regra.prioridade, mensagem: regra.mensagem });
  }
  if (!candidatos.length) return null;
  candidatos.sort(compararPendencias);
  return candidatos[0];
}

/**
 * Um avaliador por tipo de regra. Retorna { motivo, dataAlvo } ou null.
 * PONTO DE EXTENSÃO: um tipo novo de regra = uma função nova aqui.
 */
const AVALIADORES = {
  agendado(regra, { cliente, hoje, agendado }) {
    if (!agendado || agendado > hoje) return null;
    return pendencia(cliente.motivo_proximo || regra.motivoPadrao, agendado, hoje);
  },

  aposData(regra, { cliente, hist, hoje, ultimoContato }) {
    const base = BASES_DE_DATA[regra.base]?.(cliente, hist);
    if (!base) return null;
    const alvo = somarDias(base, regra.dias);
    if (alvo > hoje) return null;                                   // ainda não chegou
    if (regra.validadeDias != null && diferencaDias(alvo, hoje) > regra.validadeDias) return null; // venceu
    if (ultimoContato && ultimoContato >= alvo) return null;        // já foi contatado
    return pendencia(regra.motivo, alvo, hoje);
  },

  aniversario(regra, { cliente, hoje, ultimoContato }) {
    if (!ehAniversario(cliente.data_nascimento, hoje)) return null;
    if (ultimoContato === hoje) return null;
    return pendencia(regra.motivo, hoje, hoje);
  },
};

function pendencia(motivo, dataAlvo, hoje) {
  return { motivo, dataAlvo, diasAtraso: Math.max(0, diferencaDias(dataAlvo, hoje)) };
}

/** Ordem: prioridade da regra, depois quem está esperando há mais tempo. */
export function compararPendencias(a, b) {
  return a.prioridade - b.prioridade || b.diasAtraso - a.diasAtraso;
}

/**
 * Avalia UM lead (Fase 2). Regras em config.leads.
 * - retorno agendado vencido → aparece;
 * - lead "novo" ainda sem contato → aparece (até validadeDias depois do cadastro).
 */
export function avaliarLead(lead, contatos, hoje, config) {
  const r = config.leads;
  if (!r || !r.ativa) return null;
  if (!r.statusAtivos.includes(lead.status)) return null;
  if (config.exigeConsentimento && !ehVerdadeiro(lead.consentimento)) return null;

  if (ehDataISO(lead.proximo_contato)) {
    if (lead.proximo_contato > hoje) return null;
    return { ...pendencia(lead.motivo_proximo || r.retorno.motivoPadrao, lead.proximo_contato, hoje),
      regra: 'lead_retorno', prioridade: r.retorno.prioridade, mensagem: r.retorno.mensagem };
  }
  if (lead.status === 'novo' && !(contatos || []).length) {
    const criado = String(lead.criado_em || '').slice(0, 10);
    const base = ehDataISO(criado) ? criado : hoje;
    if (diferencaDias(base, hoje) > r.novo.validadeDias) return null;
    return { ...pendencia(r.novo.motivo, base, hoje),
      regra: 'lead_novo', prioridade: r.novo.prioridade, mensagem: r.novo.mensagem };
  }
  return null;
}

/** Status do lead depois de um contato (regra em config.resultados[].statusLead). */
export function statusLeadAposContato(statusAtual, chaveResultado, config) {
  if (statusAtual === 'convertido') return statusAtual;
  const res = config.resultados.find((x) => x.chave === chaveResultado);
  if (res?.statusLead) return res.statusLead;
  return statusAtual === 'novo' ? 'em_contato' : statusAtual;
}

/**
 * Gera a lista "Quem contatar hoje" com clientes e leads.
 * @param {Array} clientes
 * @param {{contatos, compras, receitas, leads}} dados  todos os registros
 * @returns {Array<{tipo:'cliente'|'lead', pessoa, cliente?, lead?, pendencia}>}
 */
export function gerarListaDoDia(clientes, dados, hoje, config) {
  const porCliente = agruparHistorico(dados);
  const itens = clientes.map((cliente) => ({
    tipo: 'cliente', cliente, pessoa: cliente,
    pendencia: avaliarCliente(cliente, porCliente.get(cliente.id), hoje, config),
  }));

  const contatosPorLead = new Map();
  (dados.contatos || []).filter((c) => c.lead_id).forEach((c) => {
    if (!contatosPorLead.has(c.lead_id)) contatosPorLead.set(c.lead_id, []);
    contatosPorLead.get(c.lead_id).push(c);
  });
  for (const lead of dados.leads || []) {
    itens.push({ tipo: 'lead', lead, pessoa: lead, pendencia: avaliarLead(lead, contatosPorLead.get(lead.id), hoje, config) });
  }

  return itens
    .filter((item) => item.pendencia)
    .sort((a, b) => compararPendencias(a.pendencia, b.pendencia) || a.pessoa.nome.localeCompare(b.pessoa.nome, 'pt-BR'));
}

/** Indexa contatos, compras e receitas por cliente_id. */
export function agruparHistorico({ contatos = [], compras = [], receitas = [] }) {
  const mapa = new Map();
  const pegar = (id) => {
    if (!mapa.has(id)) mapa.set(id, { contatos: [], compras: [], receitas: [] });
    return mapa.get(id);
  };
  contatos.filter((x) => x.cliente_id).forEach((x) => pegar(x.cliente_id).contatos.push(x));
  compras.forEach((x) => pegar(x.cliente_id).compras.push(x));
  receitas.forEach((x) => pegar(x.cliente_id).receitas.push(x));
  return mapa;
}

/**
 * Calcula o reagendamento sugerido para o resultado escolhido em "Contatei".
 * @returns {{ proximo_contato: string, motivo_proximo: string }}
 */
export function calcularReagendamento(chaveResultado, hoje, config) {
  const res = config.resultados.find((r) => r.chave === chaveResultado);
  if (!res || res.reagendarEmDias == null) return { proximo_contato: '', motivo_proximo: '' };
  return {
    proximo_contato: somarDias(hoje, res.reagendarEmDias),
    motivo_proximo: res.motivoRetorno || '',
  };
}

/** A planilha pode devolver TRUE/'TRUE'/'sim'. */
export function ehVerdadeiro(v) {
  return v === true || ['true', 'sim', '1', 'verdadeiro'].includes(String(v).toLowerCase());
}
