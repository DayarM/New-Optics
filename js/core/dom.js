/**
 * Ajudantes de DOM. Dados do usuário entram sempre como texto (textContent),
 * nunca como HTML — isso evita XSS sem precisar "escapar" nada à mão.
 */

export function el(tag, props = {}, ...filhos) {
  const node = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props || {})) {
    if (valor == null || valor === false) continue;
    if (chave === 'class') node.className = valor;
    else if (chave === 'text') node.textContent = valor;
    else if (chave === 'dataset') Object.assign(node.dataset, valor);
    else if (chave.startsWith('on') && typeof valor === 'function') {
      node.addEventListener(chave.slice(2).toLowerCase(), valor);
    } else if (valor === true) node.setAttribute(chave, '');
    else node.setAttribute(chave, String(valor));
  }
  for (const filho of filhos.flat(Infinity)) {
    if (filho == null || filho === false) continue;
    node.append(filho instanceof Node ? filho : String(filho));
  }
  return node;
}

export function limpar(node) {
  node.replaceChildren();
  return node;
}

/* Ícones: SVGs fixos do próprio código (não vêm do usuário). */
const SVG = {
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.5 3.6 5.2"/>',
  mais: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  conversa: '<path d="M4 19.5 5.3 16A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.6-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  sair: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>',
  busca: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  baixar: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>',
  voltar: '<path d="M15 5 8 12l7 7"/>',
  lapis: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  lixo: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  funil: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
  sacola: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  grafico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
};

export function icone(nome) {
  const span = document.createElement('span');
  span.className = 'icone';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SVG[nome] || ''}</svg>`;
  return span;
}
