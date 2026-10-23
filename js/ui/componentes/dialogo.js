/**
 * Janelas sobre a tela usando o elemento nativo <dialog>
 * (foco preso, tecla Esc e acessibilidade já vêm do navegador).
 */
import { el } from '../../core/dom.js';

/**
 * @param {{ titulo: string, montar: (fechar: (valor?: any) => void) => Node, classe?: string }} opcoes
 * @returns {Promise<any>} resolve com o valor passado a fechar() (ou undefined se cancelado)
 */
export function abrirDialogo({ titulo, montar, classe = '' }) {
  return new Promise((resolve) => {
    let valor;
    const idTitulo = `dlg-${Math.random().toString(36).slice(2)}`;
    const dialogo = el('dialog', { class: `dialogo ${classe}`, 'aria-labelledby': idTitulo });
    const fechar = (v) => { valor = v; dialogo.close(); };

    dialogo.append(
      el('div', { class: 'dialogo-cab' },
        el('h2', { id: idTitulo, class: 'dialogo-titulo' }, titulo),
        el('button', { type: 'button', class: 'btn-fechar', 'aria-label': 'Fechar', onclick: () => fechar() }, '×'),
      ),
      el('div', { class: 'dialogo-corpo' }, montar(fechar)),
    );

    // Toque fora da caixa fecha.
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo) fechar(); });
    dialogo.addEventListener('close', () => { dialogo.remove(); resolve(valor); });

    document.body.append(dialogo);
    dialogo.showModal();
  });
}

/** Confirmação simples. Resolve true/false. */
export function confirmar({ titulo, texto, confirmar = 'Confirmar', cancelar = 'Cancelar', perigo = false }) {
  return abrirDialogo({
    titulo,
    montar: (fechar) => el('div', {},
      el('p', { class: 'dialogo-texto' }, texto),
      el('div', { class: 'dialogo-acoes' },
        el('button', { type: 'button', class: 'btn btn-secundario', onclick: () => fechar(false) }, cancelar),
        el('button', {
          type: 'button',
          class: `btn ${perigo ? 'btn-perigo' : 'btn-primario'}`,
          onclick: () => fechar(true),
        }, confirmar),
      ),
    ),
  }).then(Boolean);
}
