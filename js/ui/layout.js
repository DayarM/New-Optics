/**
 * Moldura do app: cabeçalho com logo, menu (montado a partir da configuração)
 * e área principal onde as telas são desenhadas.
 */
import { APP_CONFIG, featureLigada } from '../config/app.config.js';
import { el, icone, limpar } from '../core/dom.js';

export function itensDoMenu() {
  return APP_CONFIG.menu.filter((item) => !item.flag || featureLigada(item.flag));
}

/**
 * @returns {{ principal: HTMLElement, marcarAtivo: (caminho: string) => void }}
 */
export function montarLayout(raiz, { sessao, modoDemonstracao, aoSair }) {
  limpar(raiz);
  const { loja } = APP_CONFIG;

  const links = itensDoMenu().map((item) =>
    el('a', { href: item.rota, class: 'menu-item', dataset: { rota: item.rota } },
      icone(item.icone),
      el('span', {}, item.rotulo)));

  const cabecalho = el('header', { class: 'topo' },
    el('a', { href: '#/hoje', class: 'topo-marca' },
      el('img', { src: loja.logoCompacto, alt: loja.nome, class: 'topo-logo', width: 67, height: 40 })),
    el('nav', { class: 'menu', 'aria-label': 'Menu principal' }, links),
    el('div', { class: 'topo-usuario' },
      el('span', { class: 'topo-nome' }, sessao.nome),
      el('button', { type: 'button', class: 'btn-icone', onclick: aoSair, 'aria-label': 'Sair', title: 'Sair' },
        icone('sair'))),
  );

  const faixaDemo = modoDemonstracao
    ? el('p', { class: 'faixa-demo' }, 'Modo de demonstração: os dados ficam só neste aparelho.')
    : null;

  const principal = el('main', { id: 'conteudo', class: 'conteudo', tabindex: '-1' });

  raiz.append(cabecalho, faixaDemo, principal);

  return {
    principal,
    marcarAtivo(caminho) {
      for (const a of links) {
        const alvo = a.dataset.rota.slice(1);
        // "/cliente/..." (ficha) conta como parte de "Clientes"
        const ativo = caminho === alvo
          || (alvo === '/clientes' && caminho.startsWith('/cliente/'));
        if (ativo) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      }
    },
  };
}

/* Estados reutilizáveis */

export function estadoCarregando(texto = 'Carregando…') {
  return el('div', { class: 'estado estado-carregando', role: 'status' },
    el('span', { class: 'girando', 'aria-hidden': 'true' }), el('p', {}, texto));
}

export function estadoErro(texto, aoTentar) {
  return el('div', { class: 'estado', role: 'alert' },
    el('p', { class: 'estado-titulo' }, texto),
    el('button', { type: 'button', class: 'btn btn-primario', onclick: aoTentar }, 'Tentar de novo'));
}
