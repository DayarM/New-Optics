/**
 * TELA: Painel (Fase 3) — indicadores de contatos, leads e compras.
 * Gráficos em SVG puro, sem biblioteca externa.
 */
import { h, montar } from '../../core/dom.js?v=864615d145';
import { dataService } from '../../data/dataService.js?v=864615d145';
import { clientesService } from '../../services/clientesService.js?v=864615d145';
import { calcularIndicadores, formatarMoeda } from '../../services/indicadoresService.js?v=864615d145';
import { REGRAS_RECONTATO } from '../../config/regras.config.js?v=864615d145';
import { OPCOES } from '../../config/textos.config.js?v=864615d145';
import { hojeISO, formatarData } from '../../core/datas.js?v=864615d145';
import { carregando, falhaCarregar, chips } from '../componentes/ui.js?v=864615d145';

let dias = 7;
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...filhos) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  filhos.forEach((f) => el.append(f instanceof Node ? f : document.createTextNode(String(f))));
  return el;
};

export async function telaPainel(container) {
  montar(container, carregando('Calculando indicadores…'));
  let dados, pendentes;
  try {
    dados = await dataService.obterTudo();
    pendentes = (await clientesService.listaDoDia()).length;
  } catch (erro) {
    montar(container, falhaCarregar(erro, () => telaPainel(container)));
    return;
  }
  const corpo = h('div', { class: 'painel-corpo-tela' });

  const desenhar = () => {
    const ind = calcularIndicadores(dados, { hoje: hojeISO(), dias, pendentesHoje: pendentes,
      resultados: REGRAS_RECONTATO.resultados, statusLead: OPCOES.statusLead });
    montar(corpo,
      h('div', { class: 'kpis' },
        kpi('Contatos feitos', ind.contatosFeitos),
        kpi('Para contatar hoje', ind.pendentesHoje),
        kpi('Leads novos', ind.leadsNovos),
        kpi('Leads convertidos', ind.leadsConvertidos, `${ind.taxaConversao}% de conversão geral`),
        kpi('Compras', ind.comprasQtd, formatarMoeda(ind.comprasValor)),
        kpi('Clientes sem autorização', ind.semAutorizacao, 'Não recebem mensagens')),
      dias > 1 && bloco('Contatos por dia', graficoDias(ind.contatosPorDia)),
      h('div', { class: 'grade-2' },
        bloco('Leads por status', barrasHorizontais(ind.leadsPorStatus.map((s) => ({ rotulo: s.rotulo, total: s.total, classe: `st-${s.chave}` })))),
        bloco('Resultado dos contatos', barrasHorizontais(ind.contatosPorResultado.map((r) => ({ rotulo: r.rotulo, total: r.total, classe: `res-${r.chave}` }))))),
      ind.contatosPorOperador.length > 0 && bloco('Contatos por operador',
        barrasHorizontais(ind.contatosPorOperador.map((o) => ({ rotulo: o.nome, total: o.total, classe: 'st-novo' })))));
  };

  montar(container,
    h('div', { class: 'tela-topo' }, h('div', {},
      h('h1', { class: 'titulo-tela' }, 'Painel'),
      h('p', { class: 'contagem' }, 'Números calculados com os dados atuais da planilha.'))),
    chips({ rotulo: 'Período', valor: dias,
      opcoes: [{ valor: 1, rotulo: 'Hoje' }, { valor: 7, rotulo: '7 dias' }, { valor: 30, rotulo: '30 dias' }],
      aoMudar: (v) => { dias = v; desenhar(); } }),
    corpo);
  desenhar();
}

function kpi(rotulo, valor, detalhe) {
  return h('div', { class: 'kpi' },
    h('p', { class: 'kpi-rotulo' }, rotulo),
    h('p', { class: 'kpi-valor num' }, valor),
    detalhe && h('p', { class: 'kpi-detalhe' }, detalhe));
}

function bloco(titulo, conteudo) {
  return h('section', { class: 'bloco' }, h('h2', { class: 'subtitulo' }, titulo), conteudo);
}

/** Barras verticais: contatos por dia. */
function graficoDias(serie) {
  const L = 640, A = 210, mx = Math.max(1, ...serie.map((s) => s.total));
  const largura = L / serie.length;
  const g = svg('svg', { viewBox: `0 0 ${L} ${A + 28}`, class: 'grafico', role: 'img',
    'aria-label': `Contatos por dia: ${serie.map((s) => `${formatarData(s.data)} ${s.total}`).join('; ')}` });
  g.append(svg('line', { x1: 0, x2: L, y1: A, y2: A, class: 'grafico-eixo' }));
  serie.forEach((s, i) => {
    const alt = (s.total / mx) * (A - 24);
    const x = i * largura + largura * 0.18;
    const w = largura * 0.64;
    g.append(svg('rect', { x, y: A - alt, width: w, height: Math.max(alt, 0), rx: Math.min(5, w / 3), class: 'grafico-barra' },
      svg('title', {}, `${formatarData(s.data)}: ${s.total}`)));
    if (s.total && serie.length <= 10) g.append(svg('text', { x: x + w / 2, y: A - alt - 6, class: 'grafico-valor' }, s.total));
    // No máximo ~7 datas no eixo para não embolar no celular.
    const passo = Math.ceil(serie.length / 7);
    const mostrarRotulo = (serie.length - 1 - i) % passo === 0;
    if (mostrarRotulo) g.append(svg('text', { x: x + w / 2, y: A + 20, class: 'grafico-rotulo' }, formatarData(s.data).slice(0, 5)));
  });
  return h('div', { class: 'grafico-caixa' }, g);
}

/** Barras horizontais com rótulo e total (HTML simples, acessível). */
function barrasHorizontais(itens) {
  const mx = Math.max(1, ...itens.map((i) => i.total));
  return h('ul', { class: 'barras' }, itens.map((i) => {
    const valor = h('span', { class: `barra-valor ${i.classe}` });
    valor.style.width = `${(i.total / mx) * 100}%`; // via CSSOM: permitido pela CSP (atributo style não é)
    return h('li', {},
      h('span', { class: 'barra-rotulo' }, i.rotulo),
      h('span', { class: 'barra-trilho', 'aria-hidden': 'true' }, valor),
      h('span', { class: 'barra-total num' }, i.total));
  }));
}
