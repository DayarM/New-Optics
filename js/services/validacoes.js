/**
 * Validação e normalização de formulários + busca — funções PURAS.
 * Cada validador devolve { valor, erros }, onde `erros` = { campo: 'texto simples' }.
 * O servidor repete as validações essenciais (nunca confie só no navegador).
 */
import { ehDataISO } from '../core/datas.js?v=38e7358a80';
import { normalizarWhatsapp } from './mensagemService.js?v=38e7358a80';

export function normalizarTexto(t) {
  return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Lê a escolha "Sim/Não" do formulário. Retorna true, false ou null (não respondeu). */
export function lerConsentimento(v) {
  if (v === true || v === 'sim') return true;
  if (v === false || v === 'nao') return false;
  return null;
}

function nomeProprio(t) {
  return String(t || '').trim().replace(/\s+/g, ' ');
}

export function validarCliente(d, { hoje, ddi = '55' }) {
  const erros = {};
  const valor = {
    id: d.id || '',
    nome: nomeProprio(d.nome),
    whatsapp: normalizarWhatsapp(d.whatsapp, ddi),
    ultima_compra: d.ultima_compra || '',
    data_nascimento: d.data_nascimento || '',
    observacao: String(d.observacao || '').trim().slice(0, 500),
    consentimento: lerConsentimento(d.consentimento),
  };
  if (valor.consentimento === null) erros.consentimento = 'Marque se o cliente autorizou ou não.';
  if (valor.nome.length < 2) erros.nome = 'Informe o nome do cliente.';
  if (!valor.whatsapp) erros.whatsapp = 'Informe o WhatsApp com DDD. Ex.: (85) 98888-7777';
  if (valor.ultima_compra && (!ehDataISO(valor.ultima_compra) || valor.ultima_compra > hoje))
    erros.ultima_compra = 'Data inválida ou no futuro.';
  if (valor.data_nascimento && (!ehDataISO(valor.data_nascimento) || valor.data_nascimento > hoje))
    erros.data_nascimento = 'Data de nascimento inválida.';
  return { valor, erros };
}

/** Valor em reais: aceita "1.250,90", "1250.9", "R$ 80". Guarda como "1250,90". */
export function normalizarValor(txt) {
  let s = String(txt || '').replace(/[^\d,.-]/g, '');
  if (!s) return '';
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n.toFixed(2).replace('.', ',') : null;
}

export function validarCompra(d, { hoje }) {
  const erros = {};
  const valorNum = normalizarValor(d.valor);
  const valor = {
    cliente_id: d.cliente_id,
    data: d.data || hoje,
    descricao: String(d.descricao || '').trim().slice(0, 200),
    valor: valorNum || '',
    forma_pagamento: d.forma_pagamento || '',
    observacao: String(d.observacao || '').trim().slice(0, 500),
  };
  if (!ehDataISO(valor.data) || valor.data > hoje) erros.data = 'Data inválida ou no futuro.';
  if (!valor.descricao) erros.descricao = 'Descreva o que foi comprado.';
  if (valorNum === null) erros.valor = 'Valor inválido. Ex.: 450,00';
  return { valor, erros };
}

const RE_GRAU = /^[+-]?\d{1,2}([.,]\d{1,2})?$/;
const CAMPOS_GRAU = ['od_esferico', 'od_cilindrico', 'oe_esferico', 'oe_cilindrico', 'adicao'];
const CAMPOS_EIXO = ['od_eixo', 'oe_eixo'];

export function validarReceita(d, { hoje }) {
  const erros = {};
  const valor = {
    cliente_id: d.cliente_id,
    data: d.data || hoje,
    medico: String(d.medico || '').trim().slice(0, 100),
    dnp_od: String(d.dnp_od || '').trim(),
    dnp_oe: String(d.dnp_oe || '').trim(),
    observacao: String(d.observacao || '').trim().slice(0, 500),
  };
  for (const c of CAMPOS_GRAU) {
    const v = String(d[c] || '').trim().replace('.', ',');
    if (v && !RE_GRAU.test(v)) erros[c] = 'Use o formato -2,25';
    valor[c] = v;
  }
  for (const c of CAMPOS_EIXO) {
    const v = String(d[c] || '').trim();
    if (v && !(/^\d{1,3}$/.test(v) && +v <= 180)) erros[c] = 'Eixo de 0 a 180';
    valor[c] = v;
  }
  if (!ehDataISO(valor.data) || valor.data > hoje) erros.data = 'Data inválida ou no futuro.';
  if (!CAMPOS_GRAU.some((c) => valor[c])) erros.od_esferico = 'Preencha ao menos um grau.';
  return { valor, erros };
}

/** Busca por nome (sem acento) ou por parte do número. */
export function buscarClientes(clientes, termo) {
  const t = normalizarTexto(termo);
  const lista = [...clientes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!t) return lista;
  const digitos = t.replace(/\D/g, '');
  return lista.filter((c) =>
    normalizarTexto(c.nome).includes(t) ||
    (digitos.length >= 3 && String(c.whatsapp).includes(digitos))
  );
}

const STATUS_LEAD_VALIDOS = ['novo', 'em_contato', 'agendado', 'convertido', 'perdido'];

export function validarLead(d, { hoje, ddi = '55' }) {
  const erros = {};
  const valor = {
    id: d.id || '',
    nome: nomeProprio(d.nome),
    whatsapp: normalizarWhatsapp(d.whatsapp, ddi),
    origem: String(d.origem || '').trim(),
    interesse: String(d.interesse || '').trim(),
    status: d.status || 'novo',
    proximo_contato: d.proximo_contato || '',
    observacao: String(d.observacao || '').trim().slice(0, 500),
    consentimento: lerConsentimento(d.consentimento),
  };
  if (valor.nome.length < 2) erros.nome = 'Informe o nome.';
  if (!valor.whatsapp) erros.whatsapp = 'Informe o WhatsApp com DDD. Ex.: (85) 98888-7777';
  if (valor.consentimento === null) erros.consentimento = 'Marque se a pessoa autorizou ou não.';
  if (!STATUS_LEAD_VALIDOS.includes(valor.status)) erros.status = 'Escolha um status.';
  if (valor.proximo_contato && (!ehDataISO(valor.proximo_contato) || valor.proximo_contato < hoje))
    erros.proximo_contato = 'Escolha hoje ou uma data futura.';
  return { valor, erros };
}

/**
 * Gera CSV (separador ";" e BOM) que o Excel em português abre direto.
 * @param {Array<object>} linhas
 * @param {Array<[string, string]>} colunas  [chave, título]
 */
export function gerarCSV(linhas, colunas) {
  const celula = (v) => {
    let s = v === true ? 'Sim' : v === false ? 'Não' : String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;       // evita fórmula ao abrir no Excel
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const corpo = [colunas.map(([, t]) => t), ...linhas.map((l) => colunas.map(([k]) => l[k]))]
    .map((l) => l.map(celula).join(';')).join('\r\n');
  return '\ufeff' + corpo;
}
