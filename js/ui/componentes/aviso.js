/**
 * Avisos rápidos (toast) no rodapé da tela. Leitores de tela anunciam o texto.
 */
import { el } from '../../core/dom.js';

let regiao = null;

function garantirRegiao() {
  if (regiao && document.body.contains(regiao)) return regiao;
  regiao = el('div', { class: 'avisos', role: 'status', 'aria-live': 'polite' });
  document.body.append(regiao);
  return regiao;
}

/**
 * @param {string} texto
 * @param {'sucesso'|'erro'|'info'} [tipo]
 */
export function avisar(texto, tipo = 'sucesso') {
  const r = garantirRegiao();
  const item = el('div', { class: `aviso aviso-${tipo}` }, texto);
  if (tipo === 'erro') item.setAttribute('role', 'alert');
  r.append(item);
  const duracao = tipo === 'erro' ? 7000 : 3500;
  setTimeout(() => {
    item.classList.add('saindo');
    setTimeout(() => item.remove(), 300);
  }, duracao);
}
