/**
 * Ícones no estilo Lucide (https://lucide.dev, licença ISC), embutidos no projeto
 * para não depender de CDN (a CSP só permite arquivos do próprio site).
 * Uso: icone('search')  → <svg> de 20px, herda a cor do texto.
 * PONTO DE EXTENSÃO: para um ícone novo, copie o SVG do lucide.dev e transforme
 * cada elemento em [tag, atributos] abaixo.
 */
const P = (d) => ['path', { d }];

const ICONES = {
  search: [['circle', { cx: 11, cy: 11, r: 8 }], P('m21 21-4.3-4.3')],
  info: [['circle', { cx: 12, cy: 12, r: 10 }], P('M12 16v-4M12 8h.01')],
  sun: [['circle', { cx: 12, cy: 12, r: 4 }], P('M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41')],
  moon: [P('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z')],
  users: [P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), ['circle', { cx: 9, cy: 7, r: 4 }], P('M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75')],
  userPlus: [P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), ['circle', { cx: 9, cy: 7, r: 4 }], P('M19 8v6M22 11h-6')],
  userCheck: [P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'), ['circle', { cx: 9, cy: 7, r: 4 }], P('m16 11 2 2 4-4')],
  target: [['circle', { cx: 12, cy: 12, r: 10 }], ['circle', { cx: 12, cy: 12, r: 6 }], ['circle', { cx: 12, cy: 12, r: 2 }]],
  listChecks: [P('m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8')],
  chart: [P('M3 3v18h18M18 17V9M13 17V5M8 17v-3')],
  logOut: [P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'), P('m16 17 5-5-5-5M21 12H9')],
  plus: [P('M5 12h14M12 5v14')],
  message: [P('M7.9 20A9 9 0 1 0 4 16.1L2 22Z')],
  check: [P('M20 6 9 17l-5-5')],
  chevronLeft: [P('m15 18-6-6 6-6')],
  download: [P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), P('m7 10 5 5 5-5M12 15V3')],
  pencil: [P('M21.17 6.81a2.82 2.82 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5Z'), P('m15 5 4 4')],
  trash: [P('M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2')],
  refresh: [P('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5')],
  calendar: [['rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }], P('M16 2v4M8 2v4M3 10h18')],
  x: [P('M18 6 6 18M6 6l12 12')],
};

const NS = 'http://www.w3.org/2000/svg';

export function icone(nome, { tamanho = 20, classe = '' } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  const attrs = {
    viewBox: '0 0 24 24', width: tamanho, height: tamanho, fill: 'none', stroke: 'currentColor',
    'stroke-width': 1.75, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false', class: `icone ${classe}`.trim(),
  };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, String(v));
  for (const [tag, a] of ICONES[nome] || []) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(a)) el.setAttribute(k, String(v));
    svg.append(el);
  }
  return svg;
}
