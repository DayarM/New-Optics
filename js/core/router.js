/**
 * Roteador simples por hash (#/clientes/123).
 * Funciona no GitHub Pages sem configuração de servidor.
 */
const rotas = [];
let aoTrocar = null;

/**
 * Registra uma rota. Padrão com parâmetros: '/clientes/:id'.
 * PONTO DE EXTENSÃO: novas telas (Leads, Indicadores) só registram rotas aqui.
 */
export function rota(padrao, tela) {
  const nomes = [];
  const re = new RegExp(
    '^' + padrao.replace(/:(\w+)/g, (_, n) => { nomes.push(n); return '([^/]+)'; }) + '$'
  );
  rotas.push({ padrao, re, nomes, tela });
}

export function irPara(caminho) {
  if (location.hash === '#' + caminho) resolver();
  else location.hash = caminho;
}

export function caminhoAtual() {
  return location.hash.replace(/^#/, '') || '/';
}

function resolver() {
  const caminho = caminhoAtual();
  for (const r of rotas) {
    const m = r.re.exec(caminho);
    if (m) {
      const params = Object.fromEntries(r.nomes.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      aoTrocar?.(r, params, caminho);
      return;
    }
  }
  aoTrocar?.(null, {}, caminho);
}

/** @param {(rota, params, caminho) => void} callback */
export function iniciarRoteador(callback) {
  aoTrocar = callback;
  window.addEventListener('hashchange', resolver);
  resolver();
}
