/**
 * Regras de negócio de clientes — funções PURAS.
 */
import { isoValido } from './datas.js';
import { normalizarWhatsApp } from './telefone.js';
import { limparEspacos, normalizarBusca } from './texto.js';

/**
 * Valida e normaliza os dados do formulário.
 * @returns {{ ok: boolean, erros: Record<string,string>, avisos: Record<string,string>, cliente: object }}
 */
export function validarCliente(dados, hoje) {
  const erros = {};
  const avisos = {};
  const cliente = {
    id: dados.id || '',
    nome: limparEspacos(dados.nome),
    whatsapp: '',
    dataUltimaCompra: dados.dataUltimaCompra || '',
    dataReceita: dados.dataReceita || '',
    dataNascimento: dados.dataNascimento || '',
    observacao: String(dados.observacao ?? '').trim(),
    consentimento: dados.consentimento || '',
    naoQuerContato: dados.naoQuerContato === 'SIM' ? 'SIM' : 'NAO',
    versao: dados.versao || '', // usado para detectar edição simultânea
  };

  if (cliente.nome.length < 2) erros.nome = 'Informe o nome do cliente.';
  else if (cliente.nome.length > 120) erros.nome = 'Nome muito longo (máximo de 120 letras).';

  const tel = normalizarWhatsApp(dados.whatsapp);
  if (tel.ok) {
    cliente.whatsapp = tel.numero;
    if (tel.aviso) avisos.whatsapp = tel.aviso;
  } else {
    erros.whatsapp = tel.erro;
  }

  if (!['SIM', 'NAO'].includes(cliente.consentimento)) {
    erros.consentimento = 'Marque se o cliente autorizou ou não receber mensagens.';
  }

  const datas = {
    dataUltimaCompra: 'A data da última compra',
    dataReceita: 'A data da receita',
    dataNascimento: 'A data de nascimento',
  };
  for (const [campo, rotulo] of Object.entries(datas)) {
    const v = cliente[campo];
    if (!v) continue;
    if (!isoValido(v)) erros[campo] = `${rotulo} não é válida.`;
    else if (v > hoje) erros[campo] = `${rotulo} não pode ser no futuro.`;
    else if (v < '1900-01-01') erros[campo] = `${rotulo} parece errada. Confira o ano.`;
  }

  if (cliente.observacao.length > 1000) erros.observacao = 'Observação muito longa (máximo de 1000 letras).';

  return { ok: Object.keys(erros).length === 0, erros, avisos, cliente };
}

/** Outro cliente com o mesmo WhatsApp (para avisar, não bloquear). */
export function encontrarDuplicado(clientes, whatsapp, idAtual) {
  if (!whatsapp) return null;
  return clientes.find((c) => c.whatsapp === whatsapp && c.id !== idAtual) || null;
}

/** Busca por nome (sem acento) ou por parte do número. */
export function buscarClientes(clientes, termo, max = 60) {
  const t = normalizarBusca(termo);
  const digitos = String(termo ?? '').replace(/\D/g, '');
  const ordenados = [...clientes].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  if (!t) return { resultados: ordenados.slice(0, max), total: ordenados.length };

  const achados = ordenados.filter((c) => {
    if (normalizarBusca(c.nome).includes(t)) return true;
    return digitos.length >= 4 && String(c.whatsapp).includes(digitos);
  });
  return { resultados: achados.slice(0, max), total: achados.length };
}

/* ------------------------------------------------------------------ */
/* CSV (backup)                                                        */
/* ------------------------------------------------------------------ */

/** Evita que planilhas executem fórmulas vindas dos dados (CSV injection). */
function celulaSegura(valor) {
  let s = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Gera CSV no padrão do Excel brasileiro (separador ";" e BOM para acentos).
 * @param {object[]} linhas
 * @param {{campo: string, titulo: string}[]} colunas
 */
export function gerarCSV(linhas, colunas) {
  const cabecalho = colunas.map((c) => celulaSegura(c.titulo)).join(';');
  const corpo = linhas.map((l) => colunas.map((c) => celulaSegura(l[c.campo])).join(';'));
  return '\uFEFF' + [cabecalho, ...corpo].join('\r\n');
}

export const COLUNAS_CSV_CLIENTES = [
  { campo: 'nome', titulo: 'Nome' },
  { campo: 'whatsapp', titulo: 'WhatsApp' },
  { campo: 'dataUltimaCompra', titulo: 'Última compra' },
  { campo: 'dataReceita', titulo: 'Data da receita' },
  { campo: 'dataNascimento', titulo: 'Nascimento' },
  { campo: 'consentimento', titulo: 'Autorizou contato' },
  { campo: 'dataConsentimento', titulo: 'Data da autorização' },
  { campo: 'naoQuerContato', titulo: 'Não quer contato' },
  { campo: 'observacao', titulo: 'Observação' },
  { campo: 'id', titulo: 'Código interno' },
];
