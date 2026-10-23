/**
 * Roteador por hash (#/rota). Funciona em qualquer hospedagem estática,
 * inclusive GitHub Pages, sem configuração de servidor.
 */
const rotas = [];
let rotaPadrao = '#/hoje';
let ouvinte = null;
let iniciado = false;

/** Registra uma rota. Ex.: rota('/cliente/:id', ({ id }) => ...) */
export function rota(padrao, tela) {
  const chaves = [];
  const re = new RegExp(`^${padrao.replace(/:(\w+)/g, (_, k) => { chaves.push(k); return '([^/]+)'; })}$`);
  rotas.push({ re, chaves, tela });
}

export function aoNavegar(fn) { ouvinte = fn; }

export function navegar(hash) {
  if (location.hash === hash) resolver();
  else location.hash = hash;
}

export function iniciarRoteador(padrao = '#/hoje') {
  rotaPadrao = padrao;
  if (!iniciado) {
    window.addEventListener('hashchange', resolver);
    iniciado = true;
  }
  if (!location.hash || location.hash === '#/login') location.hash = rotaPadrao;
  else resolver();
}

async function resolver() {
  const caminho = location.hash.slice(1) || '/';
  for (const r of rotas) {
    const m = r.re.exec(caminho);
    if (!m) continue;
    const params = Object.fromEntries(r.chaves.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    ouvinte?.(caminho);
    await r.tela(params);
    return;
  }
  location.hash = rotaPadrao; // rota desconhecida
}
