/**
 * Tema claro/escuro.
 * Sem escolha salva, segue o aparelho (prefers-color-scheme).
 * A escolha manual fica salva neste aparelho.
 */
const CHAVE = 'mmcrm.tema';

export function temaSalvo() {
  try { return localStorage.getItem(CHAVE); } catch { return null; }
}

/** Tema que está valendo agora: 'claro' | 'escuro'. */
export function temaAtual() {
  const salvo = temaSalvo();
  if (salvo === 'claro' || salvo === 'escuro') return salvo;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export function aplicarTema(tema) {
  const raiz = document.documentElement;
  if (tema === 'claro' || tema === 'escuro') raiz.dataset.theme = tema === 'escuro' ? 'dark' : 'light';
  else delete raiz.dataset.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', temaAtual() === 'escuro' ? '#160624' : '#3A0D63');
}

export function alternarTema() {
  const novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
  try { localStorage.setItem(CHAVE, novo); } catch { /* segue sem lembrar */ }
  aplicarTema(novo);
  return novo;
}
