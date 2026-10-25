/**
 * INDICADORES DO PAINEL — funções PURAS (testáveis com node --test).
 * Calculados no aparelho a partir dos dados já carregados.
 * PONTO DE EXTENSÃO: se o volume crescer muito, mova este cálculo para uma
 * ação `indicadores` no Code.gs e chame-a pelo dataService; a tela não muda.
 */
import { somarDias, ehDataISO } from '../core/datas.js?v=864615d145';
import { ehVerdadeiro } from './recontatoService.js?v=864615d145';

/** "1.250,90" ou "1250,90" → 1250.9 */
export function valorNumerico(txt) {
  const s = String(txt || '').replace(/[^\d,.-]/g, '');
  if (!s) return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) ? n : 0;
}

/** Datas do período: dias = 1 (hoje), 7 ou 30. Retorna lista crescente. */
export function diasDoPeriodo(hoje, dias) {
  return Array.from({ length: dias }, (_, i) => somarDias(hoje, i - dias + 1));
}

const dataDe = (txt) => String(txt || '').slice(0, 10);

/**
 * @param {{clientes, contatos, compras, leads}} dados
 * @param {{hoje:string, dias:number, pendentesHoje:number, resultados:Array, statusLead:Array}} p
 */
export function calcularIndicadores(dados, { hoje, dias, pendentesHoje = 0, resultados = [], statusLead = [] }) {
  const periodo = diasDoPeriodo(hoje, dias);
  const inicio = periodo[0];
  const noPeriodo = (d) => ehDataISO(d) && d >= inicio && d <= hoje;

  const contatos = (dados.contatos || []).filter((c) => noPeriodo(c.data));
  const compras = (dados.compras || []).filter((c) => noPeriodo(c.data));
  const leads = dados.leads || [];

  const contatosPorDia = periodo.map((d) => ({ data: d, total: contatos.filter((c) => c.data === d).length }));
  const contatosPorResultado = resultados.map((r) => ({
    chave: r.chave, rotulo: r.rotulo, total: contatos.filter((c) => c.resultado === r.chave).length,
  }));
  const porOperador = {};
  contatos.forEach((c) => { const k = c.operador || '—'; porOperador[k] = (porOperador[k] || 0) + 1; });

  const leadsNovos = leads.filter((l) => noPeriodo(dataDe(l.criado_em))).length;
  const convertidos = leads.filter((l) => l.status === 'convertido');
  const leadsConvertidosPeriodo = convertidos.filter((l) => noPeriodo(dataDe(l.atualizado_em))).length;

  return {
    inicio,
    contatosFeitos: contatos.length,
    pendentesHoje,
    contatosPorDia,
    contatosPorResultado,
    contatosPorOperador: Object.entries(porOperador).map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total),
    leadsNovos,
    leadsConvertidos: leadsConvertidosPeriodo,
    // Conversão geral: de todos os leads já cadastrados, quantos viraram cliente.
    taxaConversao: leads.length ? Math.round((convertidos.length / leads.length) * 100) : 0,
    leadsPorStatus: statusLead.map((s) => ({ ...s, total: leads.filter((l) => l.status === s.chave).length })),
    comprasQtd: compras.length,
    comprasValor: compras.reduce((soma, c) => soma + valorNumerico(c.valor), 0),
    semAutorizacao: (dados.clientes || []).filter((c) => !ehVerdadeiro(c.consentimento)).length,
  };
}

export function formatarMoeda(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
