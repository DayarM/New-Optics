/**
 * MOTOR DE RECONTATO — funções PURAS (sem DOM, sem rede, sem Date.now()).
 * Recebem clientes, contatos, "hoje" e a configuração; devolvem a lista do dia.
 * Testes em tests/recontato.test.js.
 *
 * Conceitos:
 * - gatilho: dia em que a regra passa a valer para o cliente.
 * - ciclo: uma ocorrência de uma regra para um cliente. Chave = "<regraId>:<gatilho>".
 *   Ex.: "receita_vencida:2026-03-10". Uma nova compra ou receita gera novo gatilho
 *   e, portanto, um novo ciclo — o motivo pode voltar a aparecer.
 * - atraso: dias desde o gatilho. Na lista, mais atrasado vem primeiro.
 */
import {
  isoValido, somarDias, somarMeses, diasEntre, idadeEmAnos, aniversarioNoAno,
  descreverRelativo,
} from './datas.js';
import { preencherModelo, primeiroNome } from './texto.js';

/* ------------------------------------------------------------------ */
/* Elegibilidade (LGPD)                                                */
/* ------------------------------------------------------------------ */

/** Só entra na lista quem autorizou contato e não pediu para sair. */
export function podeReceberContato(cliente) {
  return cliente?.consentimento === 'SIM' && cliente?.naoQuerContato !== 'SIM';
}

/* ------------------------------------------------------------------ */
/* Receita                                                             */
/* ------------------------------------------------------------------ */

/** Data da receita; se vazia, usa a data da última compra como aproximação. */
export function dataBaseReceita(cliente) {
  if (isoValido(cliente?.dataReceita)) return cliente.dataReceita;
  if (isoValido(cliente?.dataUltimaCompra)) return cliente.dataUltimaCompra;
  return null;
}

export function vencimentoReceita(cliente, validade) {
  const base = dataBaseReceita(cliente);
  if (!base) return null;
  let meses = validade.padraoMeses;
  const criancas = validade.criancas;
  if (criancas && isoValido(cliente.dataNascimento)) {
    const idade = idadeEmAnos(cliente.dataNascimento, base);
    if (idade != null && idade >= 0 && idade < criancas.idadeMenorQueAnos) meses = criancas.meses;
  }
  return somarMeses(base, meses);
}

/* ------------------------------------------------------------------ */
/* Tipos de condição                                                   */
/* Cada avaliador devolve { gatilho, referencia, ateDia } ou null.     */
/*   gatilho    = dia em que começa a valer                            */
/*   referencia = data usada no texto do cartão ({quando})             */
/*   ateDia     = último dia em que ainda vale (null = sem prazo)      */
/* ------------------------------------------------------------------ */

const AVALIADORES = {
  dias_apos_compra(c, cond) {
    if (!isoValido(c.dataUltimaCompra)) return null;
    const gatilho = somarDias(c.dataUltimaCompra, cond.dias);
    return {
      gatilho,
      referencia: c.dataUltimaCompra,
      ateDia: cond.validoPorDias == null ? null : somarDias(gatilho, cond.validoPorDias),
    };
  },

  antes_vencimento_receita(c, cond, ctx) {
    const venc = vencimentoReceita(c, ctx.validadeReceita);
    if (!venc) return null;
    return { gatilho: somarDias(venc, -cond.diasAntes), referencia: venc, ateDia: somarDias(venc, -1) };
  },

  apos_vencimento_receita(c, cond, ctx) {
    const venc = vencimentoReceita(c, ctx.validadeReceita);
    if (!venc) return null;
    return {
      gatilho: venc,
      referencia: venc,
      ateDia: cond.validoPorDias == null ? null : somarDias(venc, cond.validoPorDias),
    };
  },

  aniversario(c, cond, ctx) {
    if (!isoValido(c.dataNascimento)) return null;
    const gatilho = aniversarioNoAno(c.dataNascimento, Number(ctx.hoje.slice(0, 4)));
    return { gatilho, referencia: gatilho, ateDia: somarDias(gatilho, cond.toleranciaDias || 0) };
  },

  sem_compra_ha_meses(c, cond) {
    if (!isoValido(c.dataUltimaCompra)) return null;
    return { gatilho: somarMeses(c.dataUltimaCompra, cond.meses), referencia: c.dataUltimaCompra, ateDia: null };
  },
};

/**
 * PONTO DE EXTENSÃO: registra um novo tipo de condição sem mexer no motor.
 * Ex. (Fase 3): registrarTipoDeCondicao('dias_apos_venda', (cliente, cond, ctx) => ...)
 */
export function registrarTipoDeCondicao(tipo, avaliador) {
  AVALIADORES[tipo] = avaliador;
}

/* ------------------------------------------------------------------ */
/* Histórico de contatos                                               */
/* ------------------------------------------------------------------ */

function indexarResultados(resultados) {
  return Object.fromEntries((resultados || []).map((r) => [r.id, r]));
}

function ordenarPorData(contatos) {
  return [...contatos].sort((a, b) => String(a.dataHora || a.dia).localeCompare(String(b.dataHora || b.dia)));
}

/** O cliente está em pausa (ou bloqueado) por causa de algum contato recente? */
function clienteEmPausa(contatos, res, hoje) {
  for (const k of contatos) {
    const r = res[k.resultado];
    if (!r) continue;
    if (r.bloqueiaCliente) return true;
    if (r.pausaDias && diasEntre(k.dia, hoje) < r.pausaDias) return true;
  }
  return false;
}

/** Situação de um ciclo: ainda pendente? quantas tentativas já houve? */
function situacaoDoCiclo(contatosDoCiclo, res) {
  let tentativas = 0;
  for (const k of ordenarPorData(contatosDoCiclo)) {
    const r = res[k.resultado];
    if (!r) continue;
    if (r.encerraMotivo || r.bloqueiaCliente) return { pendente: false, tentativas };
    if (r.maxTentativasPorMotivo) {
      tentativas += 1;
      if (tentativas >= r.maxTentativasPorMotivo) return { pendente: false, tentativas };
    }
  }
  return { pendente: true, tentativas };
}

/* ------------------------------------------------------------------ */
/* Avaliação                                                           */
/* ------------------------------------------------------------------ */

export function compararSugestoes(a, b) {
  return (a.regra.prioridade - b.regra.prioridade) || (b.atrasoDias - a.atrasoDias);
}

/**
 * Melhor motivo de contato para um cliente hoje, ou null.
 * @param {object} cliente
 * @param {object[]} contatos  contatos DESTE cliente
 * @param {string} hoje        AAAA-MM-DD
 * @param {object} cfg         RECONTATO_CONFIG
 */
export function avaliarCliente(cliente, contatos, hoje, cfg) {
  if (!podeReceberContato(cliente)) return null;
  const res = indexarResultados(cfg.resultados);
  if (clienteEmPausa(contatos, res, hoje)) return null;

  const ctx = { hoje, validadeReceita: cfg.validadeReceita };
  const candidatos = [];

  for (const regra of cfg.regras) {
    if (!regra.ativa) continue;
    const avaliador = AVALIADORES[regra.condicao?.tipo];
    if (!avaliador) continue; // tipo desconhecido na configuração: ignora a regra

    const r = avaliador(cliente, regra.condicao, ctx);
    if (!r?.gatilho) continue;
    if (hoje < r.gatilho) continue;              // ainda não chegou
    if (r.ateDia && hoje > r.ateDia) continue;   // já passou do prazo

    const chaveCiclo = `${regra.id}:${r.gatilho}`;
    const situacao = situacaoDoCiclo(contatos.filter((k) => k.chaveCiclo === chaveCiclo), res);
    if (!situacao.pendente) continue;

    candidatos.push({
      regra,
      chaveCiclo,
      gatilho: r.gatilho,
      referencia: r.referencia,
      atrasoDias: diasEntre(r.gatilho, hoje),
      tentativa: situacao.tentativas + 1,
    });
  }

  candidatos.sort(compararSugestoes);
  return candidatos[0] || null;
}

/**
 * Lista "Quem contatar hoje".
 * Um cliente aparece uma vez só; ordem: prioridade da regra, depois atraso.
 * O limite diário desconta os clientes já contatados hoje.
 */
export function montarListaDoDia({ clientes, contatos, hoje, cfg, limiteDiario }) {
  const porCliente = new Map();
  for (const k of contatos) {
    if (!porCliente.has(k.clienteId)) porCliente.set(k.clienteId, []);
    porCliente.get(k.clienteId).push(k);
  }

  const sugestoes = [];
  for (const cliente of clientes) {
    const s = avaliarCliente(cliente, porCliente.get(cliente.id) || [], hoje, cfg);
    if (s) sugestoes.push({ cliente, ...s });
  }
  sugestoes.sort((a, b) => compararSugestoes(a, b)
    || String(a.cliente.nome).localeCompare(String(b.cliente.nome), 'pt-BR'));

  const feitosHoje = new Set(contatos.filter((k) => k.dia === hoje).map((k) => k.clienteId)).size;
  const vagas = Math.max(0, limiteDiario - feitosHoje);

  return {
    itens: sugestoes.slice(0, vagas),
    totalPendentes: sugestoes.length,
    feitosHoje,
    limiteDiario,
  };
}

/* ------------------------------------------------------------------ */
/* Textos                                                              */
/* ------------------------------------------------------------------ */

/** @param {{nome: string, endereco?: string}} loja */
export function montarMensagem(modelo, cliente, loja) {
  return preencherModelo(modelo, {
    nome: primeiroNome(cliente.nome),
    loja: loja?.nome ?? '',
    endereco: loja?.endereco ?? '',
  });
}

export function montarDetalhe(sugestao, hoje) {
  return preencherModelo(sugestao.regra.detalhe, {
    quando: descreverRelativo(diasEntre(hoje, sugestao.referencia)),
  });
}
