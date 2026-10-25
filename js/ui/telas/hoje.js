/**
 * TELA: Quem contatar hoje (tela inicial) — clientes e leads.
 * Ação principal de cada linha: chamar no WhatsApp. Depois, "Contatei".
 */
import { h, montar } from '../../core/dom.js?v=864615d145';
import { clientesService } from '../../services/clientesService.js?v=864615d145';
import { formatarData } from '../../core/datas.js?v=864615d145';
import { carregando, falhaCarregar, avisar, comIcone, botaoNovo } from '../componentes/ui.js?v=864615d145';
import { abrirPainelContato } from '../componentes/painelContato.js?v=864615d145';

export async function telaHoje(container) {
  montar(container, carregando('Montando a lista de hoje…'));
  await desenhar(container, false);
}

async function desenhar(container, forcar) {
  let lista;
  try {
    lista = await clientesService.listaDoDia({ forcar });
  } catch (erro) {
    montar(container, falhaCarregar(erro, () => telaHoje(container)));
    return;
  }

  const atualizar = h('button', {
    class: 'btn-texto', type: 'button',
    onclick: async (e) => {
      e.currentTarget.disabled = true;
      await desenhar(container, true);
      avisar('Lista atualizada.');
    },
  }, ...comIcone('refresh', 'Atualizar'));

  const total = lista.length;
  const cabecalho = h('div', { class: 'tela-topo' },
    h('div', {},
      h('h1', { class: 'titulo-tela' }, 'Quem contatar hoje'),
      h('div', { class: 'contagem' },
        h('span', {}, total === 0 ? 'Ninguém na lista' : total === 1 ? '1 pessoa' : `${total} pessoas`),
        atualizar)),
    botaoNovo('Novo cliente', '#/clientes/novo'));

  if (!total) {
    montar(container, cabecalho,
      h('div', { class: 'estado estado-vazio' },
        h('p', { class: 'estado-titulo' }, 'Tudo em dia por hoje.'),
        h('p', {}, 'Cadastre clientes com a data da última compra para que as lembranças apareçam aqui.')));
    return;
  }

  montar(container, cabecalho,
    h('ul', { class: 'lista' }, lista.map((item) => linha(item, () => desenhar(container, false)))));
}

function linha({ tipo, pessoa, pendencia }, aoContatar) {
  const ehLead = tipo === 'lead';
  const link = clientesService.linkContato(pessoa, pendencia.mensagem);
  const href = `#/${ehLead ? 'leads' : 'clientes'}/${encodeURIComponent(pessoa.id)}`;

  return h('li', { class: 'linha linha-contato', dataset: { regra: pendencia.regra } },
    h('div', { class: 'linha-info' },
      h('a', { class: 'linha-nome', href }, pessoa.nome, ehLead && h('span', { class: 'selo selo-lead' }, 'Lead')),
      h('p', { class: 'linha-sub' },
        h('span', {}, pendencia.motivo),
        pendencia.diasAtraso > 0 && h('span', { class: 'atraso' }, `desde ${formatarData(pendencia.dataAlvo)}`)),
      pessoa.observacao && h('p', { class: 'linha-obs so-tela-grande' }, pessoa.observacao)),
    h('div', { class: 'linha-acoes' },
      link
        ? h('a', { class: 'btn btn-whatsapp', href: link, target: '_blank', rel: 'noopener' }, ...comIcone('message', 'WhatsApp'))
        : h('span', { class: 'aviso-inline' }, 'Número inválido'),
      h('button', {
        class: 'btn btn-secundario', type: 'button',
        onclick: () => abrirPainelContato(pessoa, pendencia.motivo, aoContatar, { tipo }),
      }, ...comIcone('check', 'Contatei'))));
}
