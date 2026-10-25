/**
 * TELA: Leads (Fase 2) — funil com filtro por status e busca.
 */
import { h, montar } from '../../core/dom.js?v=38e7358a80';
import { leadsService } from '../../services/leadsService.js?v=38e7358a80';
import { buscarClientes } from '../../services/validacoes.js?v=38e7358a80';
import { formatarWhatsapp } from '../../services/mensagemService.js?v=38e7358a80';
import { formatarData } from '../../core/datas.js?v=38e7358a80';
import { OPCOES } from '../../config/textos.config.js?v=38e7358a80';
import { carregando, falhaCarregar, botaoNovo, chips, avatar } from '../componentes/ui.js?v=38e7358a80';
import { icone } from '../componentes/icones.js?v=38e7358a80';

let filtroStatus = 'ativos';
let ultimoTermo = '';
export const ROTULO_STATUS = Object.fromEntries(OPCOES.statusLead.map((s) => [s.chave, s.rotulo]));
const ATIVOS = ['novo', 'em_contato', 'agendado'];

export async function telaLeads(container) {
  montar(container, carregando());
  let leads;
  try {
    leads = await leadsService.todos();
  } catch (erro) {
    montar(container, falhaCarregar(erro, () => telaLeads(container)));
    return;
  }

  const resultado = h('div', { 'aria-live': 'polite' });
  const busca = h('input', { type: 'search', id: 'busca-lead', value: ultimoTermo, autocomplete: 'off',
    placeholder: 'Nome ou número', 'aria-label': 'Buscar lead por nome ou número' });

  const contar = (st) => leads.filter((l) => (st === 'ativos' ? ATIVOS.includes(l.status) : l.status === st)).length;
  const opcoes = [{ valor: 'ativos', rotulo: `Em aberto (${contar('ativos')})` },
    ...OPCOES.statusLead.map((s) => ({ valor: s.chave, rotulo: `${s.rotulo} (${contar(s.chave)})` }))];

  const desenharLista = () => {
    ultimoTermo = busca.value;
    const doStatus = leads.filter((l) => (filtroStatus === 'ativos' ? ATIVOS.includes(l.status) : l.status === filtroStatus));
    const achados = buscarClientes(doStatus, busca.value);
    montar(resultado, achados.length
      ? h('ul', { class: 'lista' }, achados.map(itemLead))
      : h('div', { class: 'estado' }, h('p', {}, leads.length ? 'Nenhum lead neste filtro.' : 'Nenhum lead cadastrado ainda.')));
  };
  busca.addEventListener('input', desenharLista);

  montar(container,
    h('div', { class: 'tela-topo' },
      h('div', {}, h('h1', { class: 'titulo-tela' }, 'Leads'),
        h('p', { class: 'contagem' }, 'Pessoas interessadas que ainda não compraram.')),
      botaoNovo('Novo lead', '#/leads/novo')),
    chips({ rotulo: 'Filtrar por status', opcoes, valor: filtroStatus, aoMudar: (v) => { filtroStatus = v; desenharLista(); } }),
    h('label', { class: 'busca', for: 'busca-lead' }, icone('search', { classe: 'busca-icone' }), busca),
    resultado);
  desenharLista();
}

function itemLead(l) {
  return h('li', { class: 'linha' },
    h('a', { class: 'linha-link', href: `#/leads/${encodeURIComponent(l.id)}` },
      avatar(l.nome, l.id),
      h('span', { class: 'linha-corpo' },
        h('span', { class: 'linha-nome' }, l.nome,
          h('span', { class: 'linha-detalhe' }, [l.interesse, l.origem].filter(Boolean).join(', '))),
        h('span', { class: 'linha-meta' },
          h('span', { class: 'num so-tela-grande' }, formatarWhatsapp(l.whatsapp)),
          l.proximo_contato && h('span', { class: 'num so-tela-grande' }, `Retorno ${formatarData(l.proximo_contato)}`),
          h('span', { class: `selo selo-status st-${l.status}` }, ROTULO_STATUS[l.status] || l.status)))));
}
